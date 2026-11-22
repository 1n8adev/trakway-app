import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, forkJoin, map, of, startWith } from 'rxjs';
import {
  BILL_FILE_TYPES,
  PURCHASE_LIMITS,
  Purchase,
  PurchaseItem,
  PurchaseOptionProduct,
  PurchaseOptions,
  PurchasePayload,
} from '../../../core/models/purchase.model';
import { PurchaseService } from '../../../core/services/purchase.service';
import { ToastService } from '../../../core/services/toast.service';
import { formatIsoDate, todayIso } from '../../../core/utils/date';
import { blobErrorMessage } from '../../../core/utils/download';
import { applyServerErrors } from '../../../core/utils/form-errors';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { TWO_DECIMALS, round2, rupees, signedRupees } from '../../../core/utils/pricing';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog';

type ItemGroup = FormGroup<{
  supplier_product_id: FormControl<number | null>;
  quantity: FormControl<number | null>;
  unit_price: FormControl<number | null>;
}>;
type ItemField = 'supplier_product_id' | 'quantity' | 'unit_price';

// Name / HSN / GST shown for a line: from the supplier product, or the saved copy for inactive ones.
interface LineInfo {
  name: string;
  hsn_code: string;
  gst_rate: number;
}

const amount = (allowZero: boolean) => (control: AbstractControl): ValidationErrors | null => {
  const v = control.value;
  if (v === null || (v as unknown) === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0)) return { amount: true };
  return TWO_DECIMALS.test(String(v)) ? null : { decimals: true };
};

// New / edit purchase: supplier (fixed after save), the supplier's bill no / date / file, and the lines.
// Amounts are previewed here with the same maths as the API, which calculates the saved values.
@Component({
  selector: 'app-purchase-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './purchase-form.html',
})
export class PurchaseForm {
  private readonly fb = inject(FormBuilder);
  private readonly purchaseService = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly fieldState = fieldState;
  protected readonly limits = PURCHASE_LIMITS;
  protected readonly rupees = rupees;
  protected readonly signedRupees = signedRupees;
  protected readonly formatDate = formatIsoDate;

  private readonly id = Number(this.route.snapshot.paramMap.get('id')) || null;
  protected readonly isEdit = this.id !== null;

  protected readonly options = signal<PurchaseOptions | null>(null);
  protected readonly purchase = signal<Purchase | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  // Bill file: a newly picked file, or removal of the stored one.
  protected readonly newFile = signal<File | null>(null);
  protected readonly removeFile = signal(false);
  protected readonly fileError = signal<string | null>(null);

  // Saved lines' copies, so lines whose product is now inactive still show their name / HSN / GST.
  private savedInfo = new Map<number, LineInfo>();
  private saved = false;

  protected readonly form = this.fb.group({
    supplier_id: this.fb.control<number | null>(null, Validators.required),
    bill_no: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(PURCHASE_LIMITS.maxBillNo)]),
    bill_date: this.fb.nonNullable.control(todayIso(), Validators.required),
    notes: this.fb.nonNullable.control('', Validators.maxLength(PURCHASE_LIMITS.maxNotes)),
    items: this.fb.array<ItemGroup>([]),
  });

  protected get items(): FormArray<ItemGroup> {
    return this.form.controls.items;
  }

  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue()), map(() => this.form.getRawValue())), {
    requireSync: true,
  });

  protected readonly supplier = computed(() => {
    const p = this.purchase();
    if (p) return { id: p.supplier_id, name: p.supplier_name, state: p.supplier_state, gstin: p.supplier_gstin };
    return this.options()?.suppliers.find((s) => s.id === this.value().supplier_id) ?? null;
  });

  // Active products of the chosen supplier.
  protected readonly products = computed<PurchaseOptionProduct[]>(() => {
    const s = this.supplier();
    return s ? (this.options()?.products ?? []).filter((p) => p.supplier_id === s.id) : [];
  });

  protected readonly intraState = computed(() => {
    const s = this.supplier();
    return !!s && s.state === this.options()?.seller_state;
  });

  // Same maths as the API's calculate(): per line taxable = qty × rate, tax at the line's GST; total rounded to the rupee.
  protected readonly preview = computed(() => {
    const lines = this.value().items.map((item) => {
      const info = this.info(item.supplier_product_id);
      const qty = Number(item.quantity);
      const rate = Number(item.unit_price);
      const ok = info && Number.isFinite(qty) && Number.isFinite(rate) && item.quantity !== null && item.unit_price !== null;
      const taxable = ok ? round2(qty * rate) : 0;
      const tax = ok ? round2((taxable * info!.gst_rate) / 100) : 0;
      return { taxable, tax, total: round2(taxable + tax) };
    });
    const subtotal = round2(lines.reduce((s, l) => s + l.taxable, 0));
    const tax = round2(lines.reduce((s, l) => s + l.tax, 0));
    const intra = this.intraState();
    const cgst = intra ? round2(lines.reduce((s, l) => s + round2(l.tax / 2), 0)) : 0;
    const exact = round2(subtotal + tax);
    const grand = Math.round(exact);
    return {
      lines,
      subtotal,
      cgst,
      sgst: intra ? round2(tax - cgst) : 0,
      igst: intra ? 0 : tax,
      tax,
      roundOff: round2(grand - exact),
      grand,
      quantity: round2(this.value().items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)),
    };
  });

  constructor() {
    const purchase$: Observable<Purchase | null> = this.id ? this.purchaseService.getById(this.id) : of(null);
    forkJoin({ options: this.purchaseService.options(), purchase: purchase$ })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ options, purchase }) => {
          this.options.set(options);
          if (purchase) this.fill(purchase);
          else {
            const preset = Number(this.route.snapshot.queryParamMap.get('supplier_id'));
            if (options.suppliers.some((s) => s.id === preset)) this.form.controls.supplier_id.setValue(preset);
            if (!this.items.length) this.addLine();
            this.form.markAsPristine();
          }
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.loadError.set(getErrorMessage(err, this.isEdit ? 'Could not load the purchase' : 'Could not load the form'));
        },
      });

    // A different supplier has different products: start the lines again.
    this.form.controls.supplier_id.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.isEdit) return;
      this.items.clear();
      this.addLine();
    });
  }

  private fill(p: Purchase): void {
    this.purchase.set(p);
    this.savedInfo = new Map((p.items ?? []).map((i: PurchaseItem) => [i.supplier_product_id, { name: i.name, hsn_code: i.hsn_code, gst_rate: i.gst_rate }]));
    this.form.controls.supplier_id.setValue(p.supplier_id, { emitEvent: false });
    this.form.controls.supplier_id.disable({ emitEvent: false });
    this.form.patchValue({ bill_no: p.bill_no, bill_date: p.bill_date, notes: p.notes ?? '' });
    this.items.clear();
    for (const item of p.items ?? []) this.items.push(this.line(item.supplier_product_id, item.quantity, item.unit_price));
    this.newFile.set(null);
    this.removeFile.set(false);
    this.form.markAsPristine();
  }

  private line(productId: number | null = null, quantity: number | null = 1, unitPrice: number | null = null): ItemGroup {
    return this.fb.group({
      supplier_product_id: this.fb.control<number | null>(productId, Validators.required),
      quantity: this.fb.control<number | null>(quantity, [Validators.required, amount(false)]),
      unit_price: this.fb.control<number | null>(unitPrice, [Validators.required, amount(true)]),
    });
  }

  protected info(productId: number | null): LineInfo | null {
    if (!productId) return null;
    return this.products().find((p) => p.id === productId) ?? this.savedInfo.get(productId) ?? null;
  }

  // True when the line's product isn't in the active list (kept from the saved purchase).
  protected isInactive(productId: number | null): boolean {
    return !!productId && !this.products().some((p) => p.id === productId);
  }

  // Products already picked on other lines are hidden from this line's list.
  protected available(index: number): PurchaseOptionProduct[] {
    const taken = new Set(this.items.controls.filter((_, i) => i !== index).map((c) => c.controls.supplier_product_id.value));
    return this.products().filter((p) => !taken.has(p.id));
  }

  protected addLine(): void {
    if (this.items.length < PURCHASE_LIMITS.maxItems) this.items.push(this.line());
  }

  protected removeLine(index: number): void {
    this.items.removeAt(index);
    this.form.markAsDirty();
  }

  // Picking a product fills the rate with its last purchase price (editable to match the bill).
  protected onProduct(index: number, raw: string): void {
    const row = this.items.at(index);
    const product = this.products().find((p) => p.id === Number(raw));
    row.controls.supplier_product_id.setValue(product?.id ?? null);
    row.controls.supplier_product_id.markAsTouched();
    if (product) row.controls.unit_price.setValue(product.price);
    this.form.markAsDirty();
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    if (!BILL_FILE_TYPES.includes(file.type)) {
      this.fileError.set('Choose a PDF, JPG, PNG or WEBP file');
      return;
    }
    if (file.size > PURCHASE_LIMITS.maxFileMb * 1024 * 1024) {
      this.fileError.set(`The file must be ${PURCHASE_LIMITS.maxFileMb} MB or smaller`);
      return;
    }
    this.fileError.set(null);
    this.newFile.set(file);
    this.removeFile.set(false);
    this.form.markAsDirty();
  }

  protected clearNewFile(): void {
    this.newFile.set(null);
  }

  protected toggleRemoveFile(): void {
    this.removeFile.update((v) => !v);
    this.form.markAsDirty();
  }

  protected fileSize(file: File): string {
    return file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(file.size / 1024)} KB`;
  }

  protected viewBill(): void {
    const p = this.purchase();
    if (!p) return;
    const tab = window.open('', '_blank');
    this.purchaseService.bill(p.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (tab) tab.location.href = url;
        else window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: async (err) => {
        tab?.close();
        this.toast.error(await blobErrorMessage(err, 'Could not open the bill'));
      },
    });
  }

  protected cellError(index: number, field: ItemField): string | null {
    const control = this.items.at(index).controls[field];
    if (!control.touched || !control.errors) return null;
    if (control.hasError('server')) return control.getError('server');
    if (control.hasError('required')) return field === 'supplier_product_id' ? 'Select a product' : field === 'quantity' ? 'Enter quantity' : 'Enter rate';
    if (control.hasError('decimals')) return 'At most 2 decimals';
    return field === 'quantity' ? 'More than 0' : '0 or more';
  }

  protected cellClass(index: number, field: ItemField): string {
    return fieldState(!!this.cellError(index, field));
  }

  protected fieldError(field: 'supplier_id' | 'bill_no' | 'bill_date' | 'notes' | 'items'): string | null {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return null;
    if (control.hasError('server')) return control.getError('server');
    if (control.hasError('required')) {
      return field === 'supplier_id' ? 'Select a supplier' : field === 'bill_no' ? "Enter the supplier's bill number" : 'Select a date';
    }
    if (control.hasError('maxlength')) return `At most ${control.getError('maxlength').requiredLength} characters`;
    return 'Invalid';
  }

  protected submit(): void {
    if (!this.items.length) {
      this.error.set('Add at least one product');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please fix the highlighted fields');
      return;
    }
    const f = this.form.getRawValue();
    const payload: PurchasePayload = {
      supplier_id: this.isEdit ? undefined : f.supplier_id!,
      bill_no: f.bill_no.trim(),
      bill_date: f.bill_date,
      notes: f.notes.trim() || null,
      items: f.items.map((i) => ({ supplier_product_id: i.supplier_product_id!, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
      bill_file: this.newFile(),
      remove_bill_file: this.removeFile() && !this.newFile(),
    };
    const request = this.id ? this.purchaseService.update(this.id, payload) : this.purchaseService.create(payload);
    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toast.success(res.message);
        if (this.isEdit) {
          this.fill(res.data);
        } else {
          this.saved = true;
          this.router.navigate(['/purchases', res.data.id, 'edit'], { replaceUrl: true });
        }
      },
      error: (err) => {
        this.saving.set(false);
        const fields = getFieldErrors(err);
        this.error.set(getErrorMessage(err, 'Could not save the purchase'));
        if (fields['bill_file']) this.fileError.set(fields['bill_file']);
        applyServerErrors(this.form, fields);
      },
    });
  }

  // canDeactivate: ask before leaving with unsaved changes.
  confirmDiscard(): Observable<boolean> | boolean {
    if (this.saved || !this.form.dirty) return true;
    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: { title: 'Discard this purchase?', message: 'Your changes have not been saved.', confirmText: 'Discard', danger: true },
        width: '420px',
        autoFocus: false,
      })
      .afterClosed()
      .pipe(map((ok) => !!ok));
  }
}
