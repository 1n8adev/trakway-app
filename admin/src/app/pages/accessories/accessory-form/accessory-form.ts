import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { startWith } from 'rxjs';
import {
  ACCESSORY_LIMITS,
  GST_RATES,
  MappableSupplierProduct,
  ProductAccessory,
  mappedToLabel,
  ProductAccessoryPayload,
} from '../../../core/models/product-accessory.model';
import { ProductAccessoryService } from '../../../core/services/product-accessory.service';
import { applyServerErrors, controlError } from '../../../core/utils/form-errors';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { TWO_DECIMALS, round2, rupees } from '../../../core/utils/pricing';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';

export interface AccessoryFormData {
  // null = add a new accessory.
  accessory: ProductAccessory | null;
}

const notBlank = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

const price = (control: AbstractControl): ValidationErrors | null => {
  const v = control.value;
  if (v === null || v === '') return null; // "required" reports empties
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return { amount: true };
  return TWO_DECIMALS.test(String(v)) ? null : { decimals: true };
};

const hsn = (control: AbstractControl): ValidationErrors | null =>
  !control.value?.trim() || /^\d{4,8}$/.test(control.value.trim()) ? null : { hsn: true };

const LABELS: Record<string, string> = { name: 'Name', price: 'Price', hsn_code: 'HSN code', gst_rate: 'GST' };

// Add / edit a product accessory. Closes with the saved accessory, or undefined when cancelled.
@Component({
  selector: 'app-accessory-form',
  imports: [ReactiveFormsModule],
  templateUrl: './accessory-form.html',
})
export class AccessoryForm {
  private readonly fb = inject(FormBuilder);
  private readonly accessoryService = inject(ProductAccessoryService);
  private readonly dialogRef = inject<MatDialogRef<AccessoryForm, ProductAccessory>>(MatDialogRef);
  private readonly data = inject<AccessoryFormData>(MAT_DIALOG_DATA);

  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly limits = ACCESSORY_LIMITS;
  protected readonly gstRates = GST_RATES;
  protected readonly rupees = rupees;
  protected readonly isEdit = !!this.data.accessory;

  private readonly a = this.data.accessory;

  protected readonly form = this.fb.group({
    name: this.fb.nonNullable.control(this.a?.name ?? '', [Validators.required, notBlank, Validators.maxLength(ACCESSORY_LIMITS.maxName)]),
    price: this.fb.control<number | null>(this.a?.price ?? null, [Validators.required, price]),
    hsn_code: this.fb.nonNullable.control(this.a?.hsn_code ?? '', [Validators.required, hsn]),
    gst_rate: this.fb.nonNullable.control<number>(this.a?.gst_rate ?? 18),
    is_active: this.fb.nonNullable.control(this.a?.is_active ?? true),
  });

  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), { requireSync: true });

  // Price with GST, shown under the price field.
  protected readonly withGst = computed(() => {
    const p = Number(this.value().price);
    if (!Number.isFinite(p) || this.value().price === null || (this.value().price as unknown) === '') return null;
    return round2(p * (1 + Number(this.value().gst_rate) / 100));
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  // Supplier products mapping: which supplier products are this accessory.
  protected readonly mappable = signal<MappableSupplierProduct[]>([]);
  protected readonly mappableLoading = signal(true);
  protected readonly mappableError = signal<string | null>(null);
  protected readonly selected = signal<Set<number>>(new Set());
  protected readonly pickerSearch = signal('');
  protected readonly mappingError = signal<string | null>(null);
  private initialSelection = '';

  // Selected ones first, then the rest; filtered by product or supplier name.
  protected readonly pickerRows = computed(() => {
    const q = this.pickerSearch().trim().toLowerCase();
    const sel = this.selected();
    return this.mappable()
      .filter((sp) => !q || sp.name.toLowerCase().includes(q) || sp.supplier_name.toLowerCase().includes(q))
      .sort((x, y) => Number(sel.has(y.id)) - Number(sel.has(x.id)));
  });
  protected readonly selectedRows = computed(() => this.mappable().filter((sp) => this.selected().has(sp.id)));

  constructor() {
    this.accessoryService.supplierProducts().subscribe({
      next: (rows) => {
        this.mappable.set(rows);
        const mine = rows.filter((sp) => this.a && sp.accessory_id === this.a.id).map((sp) => sp.id);
        this.selected.set(new Set(mine));
        this.initialSelection = [...mine].sort((x, y) => x - y).join(',');
        this.mappableLoading.set(false);
      },
      error: (err) => {
        this.mappableLoading.set(false);
        this.mappableError.set(getErrorMessage(err, 'Could not load supplier products'));
      },
    });
  }

  // Mapped to a different accessory or to a product: can't be picked here (unmap it there first).
  protected mappedElsewhere(sp: MappableSupplierProduct): boolean {
    return !!sp.product_id || (!!sp.accessory_id && sp.accessory_id !== this.a?.id);
  }

  protected readonly mappedToLabel = mappedToLabel;

  protected toggle(sp: MappableSupplierProduct): void {
    if (this.mappedElsewhere(sp)) return;
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(sp.id)) next.delete(sp.id);
      else next.add(sp.id);
      return next;
    });
    this.mappingError.set(null);
  }

  private selectionChanged(): boolean {
    return [...this.selected()].sort((x, y) => x - y).join(',') !== this.initialSelection;
  }

  protected fieldError(field: keyof typeof LABELS): string | null {
    const control = this.form.get(field)!;
    if (!control.touched || !control.errors) return null;
    if (control.hasError('amount')) return 'Enter 0 or more';
    if (control.hasError('decimals')) return 'At most 2 decimals';
    if (control.hasError('hsn')) return 'HSN code must be 4 to 8 digits';
    return controlError(control, LABELS[field]);
  }

  protected fieldClass(field: keyof typeof LABELS): string {
    return fieldState(!!this.fieldError(field));
  }

  protected close(): void {
    if (!this.saving()) this.dialogRef.close();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const f = this.form.getRawValue();
    const all: Omit<Required<ProductAccessoryPayload>, 'supplier_product_ids'> = {
      name: f.name.trim(),
      price: Number(f.price),
      hsn_code: f.hsn_code.trim(),
      gst_rate: Number(f.gst_rate),
      is_active: f.is_active,
    };
    const a = this.a;
    // PUT takes only what changed.
    const payload: ProductAccessoryPayload = a
      ? Object.fromEntries(Object.entries(all).filter(([key, value]) => value !== a[key as keyof ProductAccessory]))
      : all;
    // The mapping is sent only when it changed (and only once the list has loaded).
    if (!this.mappableLoading() && !this.mappableError() && (a ? this.selectionChanged() : this.selected().size)) {
      payload.supplier_product_ids = [...this.selected()];
    }
    if (a && !Object.keys(payload).length) {
      this.dialogRef.close();
      return;
    }
    const request = a ? this.accessoryService.update(a.id, payload) : this.accessoryService.create(payload);
    this.saving.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;
    request.subscribe({
      next: (res) => this.dialogRef.close(res.data),
      error: (err) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.error.set(getErrorMessage(err, 'Could not save the accessory'));
        const fields = getFieldErrors(err);
        if (fields['supplier_product_ids']) this.mappingError.set(fields['supplier_product_ids']);
        applyServerErrors(this.form, fields);
      },
    });
  }
}
