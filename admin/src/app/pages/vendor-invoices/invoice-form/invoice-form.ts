import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable, forkJoin, map, of, startWith } from 'rxjs';
import {
  VENDOR_INVOICE_LIMITS,
  VendorInvoice,
  VendorInvoiceOptionProduct,
  VendorInvoiceOptionVariant,
  VendorInvoiceOptions,
  VendorInvoicePayload,
} from '../../../core/models/vendor-invoice.model';
import { ToastService } from '../../../core/services/toast.service';
import { VendorInvoiceService } from '../../../core/services/vendor-invoice.service';
import { todayIso } from '../../../core/utils/date';
import { applyServerErrors } from '../../../core/utils/form-errors';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { TWO_DECIMALS, round2, rupees, signedRupees } from '../../../core/utils/pricing';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog';

// A line is a catalog product, a product accessory, or custom text. kind is UI-only (not sent).
export type ItemKind = 'product' | 'accessory' | 'custom';

type ItemGroup = FormGroup<{
  kind: FormControl<ItemKind>;
  product_id: FormControl<number | null>;
  variant_id: FormControl<number | null>;
  accessory_id: FormControl<number | null>;
  description: FormControl<string>;
  hsn_sac: FormControl<string>;
  quantity: FormControl<number | null>;
  unit_price: FormControl<number | null>;
  gst_rate: FormControl<number>;
}>;
type ItemField = keyof ItemGroup['controls'];

// Same rules as the API's vendor-invoice.validation.js.
const amount = (allowZero: boolean) => (control: AbstractControl): ValidationErrors | null => {
  const v = control.value;
  if (v === null || v === '') return null; // "required" reports empties
  const n = Number(v);
  if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0)) return { amount: true };
  return TWO_DECIMALS.test(String(v)) ? null : { decimals: true };
};

const hsn = (control: AbstractControl): ValidationErrors | null =>
  !control.value?.trim() || /^\d{4,8}$/.test(control.value.trim()) ? null : { hsn: true };

const addDays = (iso: string, days: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
};

// Create (/vendor-invoices/new?vendor_id=&type_id=) or edit (/vendor-invoices/:id/edit) a vendor GST invoice.
// Totals are previewed here with the API's maths; the API recalculates and stores the real amounts.
@Component({
  selector: 'app-invoice-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './invoice-form.html',
})
export class InvoiceForm {
  private readonly fb = inject(FormBuilder);
  private readonly invoiceService = inject(VendorInvoiceService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly fieldState = fieldState;
  protected readonly limits = VENDOR_INVOICE_LIMITS;
  protected readonly rupees = rupees;
  protected readonly signedRupees = signedRupees;
  protected readonly itemKinds: { value: ItemKind; label: string }[] = [
    { value: 'product', label: 'Product' },
    { value: 'accessory', label: 'Accessory' },
    { value: 'custom', label: 'Custom' },
  ];

  private readonly editId = Number(this.route.snapshot.paramMap.get('id')) || null;
  protected readonly isEdit = !!this.editId;

  protected readonly options = signal<VendorInvoiceOptions | null>(null);
  protected readonly invoice = signal<VendorInvoice | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  private saved = false;

  protected readonly form = this.fb.group({
    // Asked on create; fixed afterwards (it decides the number series), so disabled when editing.
    type_id: this.fb.control<number | null>(null, Validators.required),
    vendor_id: this.fb.control<number | null>(null, Validators.required),
    invoice_date: this.fb.nonNullable.control(todayIso(), Validators.required),
    due_date: this.fb.nonNullable.control(''),
    notes: this.fb.nonNullable.control('', Validators.maxLength(VENDOR_INVOICE_LIMITS.maxNotes)),
    terms: this.fb.nonNullable.control('', Validators.maxLength(VENDOR_INVOICE_LIMITS.maxTerms)),
    items: this.fb.array<ItemGroup>([]),
  });

  protected get items(): FormArray<ItemGroup> {
    return this.form.controls.items;
  }

  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(null), map(() => this.form.getRawValue())), {
    requireSync: true,
  });

  // Vendors to pick from: active ones, plus the invoice's own vendor when editing (it may be inactive now).
  protected readonly vendors = computed(() => {
    const list = this.options()?.vendors ?? [];
    const inv = this.invoice();
    if (inv && !list.some((v) => v.id === inv.vendor_id)) {
      return [{ id: inv.vendor_id, name: `${inv.bill_name} (inactive)`, contact_person: null, mobile: inv.bill_mobile, gstin: inv.bill_gstin, city: inv.bill_city, state: inv.bill_state }, ...list];
    }
    return list;
  });

  // Types to pick from on create (active ones). When editing, only the invoice's own type is shown.
  protected readonly types = computed(() => {
    const inv = this.invoice();
    if (inv) return [{ id: inv.type_id, name: inv.type_name, prefix: inv.type_prefix }];
    return this.options()?.types ?? [];
  });

  protected readonly selectedType = computed(() => this.types().find((t) => t.id === Number(this.value().type_id)) ?? null);

  // Number the invoice will get, e.g. "TWR/2026-27/####" (the sequence is assigned on save).
  protected readonly numberPreview = computed(() => {
    const type = this.selectedType();
    const date = this.value().invoice_date;
    if (!type || !date) return null;
    const [year, month] = date.split('-').map(Number);
    const start = month >= 4 ? year : year - 1;
    return `${type.prefix}/${start}-${String((start + 1) % 100).padStart(2, '0')}/####`;
  });

  protected readonly vendor = computed(() => this.vendors().find((v) => v.id === Number(this.value().vendor_id)) ?? null);

  // Same state as the seller: CGST + SGST, otherwise IGST. Unknown until a vendor is picked.
  protected readonly intraState = computed(() => {
    const vendor = this.vendor();
    const seller = this.options()?.seller_state;
    return vendor && seller ? vendor.state.trim().toLowerCase() === seller.trim().toLowerCase() : null;
  });

  // Live preview of the API's calculate(): per line taxable = qty x rate, tax = taxable x GST %.
  protected readonly totals = computed(() => {
    const intra = this.intraState() ?? true;
    const lines = this.value().items.map((item) => {
      const taxable = round2((Number(item.quantity) || 0) * (Number(item.unit_price) || 0));
      const tax = round2((taxable * (Number(item.gst_rate) || 0)) / 100);
      return { taxable, tax, rate: Number(item.gst_rate) || 0, total: round2(taxable + tax) };
    });
    const byRate = new Map<number, { rate: number; taxable: number; tax: number }>();
    for (const l of lines) {
      const g = byRate.get(l.rate) ?? { rate: l.rate, taxable: 0, tax: 0 };
      g.taxable = round2(g.taxable + l.taxable);
      g.tax = round2(g.tax + l.tax);
      byRate.set(l.rate, g);
    }
    const subtotal = round2(lines.reduce((s, l) => s + l.taxable, 0));
    const tax = round2(lines.reduce((s, l) => s + l.tax, 0));
    const exact = round2(subtotal + tax);
    const grand = Math.round(exact);
    return {
      lines,
      subtotal,
      tax,
      roundOff: round2(grand - exact),
      grand,
      rates: [...byRate.values()]
        .filter((g) => g.tax > 0)
        .sort((a, b) => a.rate - b.rate)
        .map((g) => ({ ...g, cgst: round2(g.tax / 2), sgst: round2(g.tax - round2(g.tax / 2)) })),
      intra,
    };
  });

  constructor() {
    const request: Observable<[VendorInvoiceOptions, VendorInvoice | null]> = forkJoin([
      this.invoiceService.options(this.editId),
      this.editId ? this.invoiceService.getById(this.editId) : of(null),
    ]);
    request.pipe(takeUntilDestroyed()).subscribe({
      next: ([options, invoice]) => {
        this.options.set(options);
        if (invoice?.status === 'cancelled') {
          this.toast.error('Cancelled invoices cannot be edited');
          this.router.navigate(['/vendor-invoices', invoice.id], { replaceUrl: true });
          return;
        }
        this.invoice.set(invoice);
        if (invoice) this.fill(invoice);
        else this.startNew(options);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(err, 'Could not load the invoice form'));
      },
    });
  }

  private startNew(options: VendorInvoiceOptions): void {
    const vendorId = Number(this.route.snapshot.queryParamMap.get('vendor_id'));
    const vendor = options.vendors.find((v) => v.id === vendorId);
    // ?type_id= preselects a type; otherwise the first active type (e.g. Sales Invoice) is the default.
    const typeId = Number(this.route.snapshot.queryParamMap.get('type_id'));
    const type = options.types.find((t) => t.id === typeId) ?? options.types[0] ?? null;
    this.form.patchValue({
      type_id: type?.id ?? null,
      vendor_id: vendor?.id ?? null,
      due_date: addDays(todayIso(), 15),
      terms: options.default_terms,
    });
    this.addItem();
    this.form.markAsPristine();
  }

  private fill(inv: VendorInvoice): void {
    this.form.controls.type_id.disable();
    this.form.patchValue({
      type_id: inv.type_id,
      vendor_id: inv.vendor_id,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date ?? '',
      notes: inv.notes ?? '',
      terms: inv.terms ?? '',
    });
    for (const item of inv.items) {
      if (item.variant_id && item.variant_label) this.savedVariantLabels.set(item.variant_id, item.variant_label);
      const group = this.itemGroup({
        kind: item.product_id ? 'product' : item.accessory_id ? 'accessory' : 'custom',
        product_id: item.product_id,
        variant_id: item.variant_id,
        accessory_id: item.accessory_id,
        description: item.description,
        hsn_sac: item.hsn_sac ?? '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst_rate: item.gst_rate,
      });
      this.savedLines.add(group);
      this.items.push(group);
    }
    this.form.markAsPristine();
  }

  private itemGroup(v: Partial<ReturnType<ItemGroup['getRawValue']>> = {}): ItemGroup {
    return this.fb.group({
      kind: this.fb.nonNullable.control<ItemKind>(v.kind ?? 'product'),
      product_id: this.fb.control<number | null>(v.product_id ?? null),
      variant_id: this.fb.control<number | null>(v.variant_id ?? null),
      accessory_id: this.fb.control<number | null>(v.accessory_id ?? null),
      description: this.fb.nonNullable.control(v.description ?? '', Validators.maxLength(VENDOR_INVOICE_LIMITS.maxDescription)),
      hsn_sac: this.fb.nonNullable.control(v.hsn_sac ?? '', hsn),
      quantity: this.fb.control<number | null>(v.quantity ?? 1, [Validators.required, amount(false)]),
      unit_price: this.fb.control<number | null>(v.unit_price ?? null, [Validators.required, amount(true)]),
      gst_rate: this.fb.nonNullable.control(v.gst_rate ?? this.options()?.default_gst_rate ?? 18),
    }) as ItemGroup;
  }

  protected addItem(): void {
    if (this.items.length >= VENDOR_INVOICE_LIMITS.maxItems) return;
    this.items.push(this.itemGroup());
  }

  protected removeItem(index: number): void {
    this.items.removeAt(index);
    this.items.markAsDirty();
  }

  // Saved lines may point at a product / accessory that is inactive now (not in options).
  protected hasProduct(id: number): boolean {
    return (this.options()?.products ?? []).some((p) => p.id === id);
  }

  protected hasAccessory(id: number): boolean {
    return (this.options()?.accessories ?? []).some((a) => a.id === id);
  }

  // Labels of combinations on the saved invoice, for ones that are inactive now (not in options).
  private readonly savedVariantLabels = new Map<number, string>();

  protected productOf(id: number | null): VendorInvoiceOptionProduct | undefined {
    return id ? this.options()?.products.find((p) => p.id === id) : undefined;
  }

  // Active combinations of the line's product (empty for products sold without combinations).
  protected variantsOf(index: number): VendorInvoiceOptionVariant[] {
    return this.productOf(this.items.at(index).controls.product_id.value)?.variants ?? [];
  }

  // The line's saved combination when it isn't active any more: { id, label } to keep it selectable.
  protected inactiveVariant(index: number): { id: number; label: string } | null {
    const id = this.items.at(index).controls.variant_id.value;
    if (!id || this.variantsOf(index).some((v) => v.id === id)) return null;
    return { id, label: this.savedVariantLabels.get(id) ?? 'Saved combination' };
  }

  // Stock for a product / accessory line: what's available vs. the total asked for that item on this invoice
  // (several lines can sell the same item). A warning only — the invoice can still be saved.
  protected stockInfo(index: number): { available: number; requested: number; short: boolean } | null {
    const rows = this.value().items;
    const row = rows[index];
    if (!row) return null;
    let available: number | undefined;
    let same: (r: (typeof rows)[number]) => boolean;
    if (row.kind === 'product' && row.product_id) {
      available = this.productOf(row.product_id)?.stock;
      same = (r) => r.kind === 'product' && r.product_id === row.product_id;
    } else if (row.kind === 'accessory' && row.accessory_id) {
      available = this.options()?.accessories.find((a) => a.id === row.accessory_id)?.stock;
      same = (r) => r.kind === 'accessory' && r.accessory_id === row.accessory_id;
    } else {
      return null;
    }
    if (available === undefined) return null;
    const requested = round2(rows.filter(same).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0));
    return { available, requested, short: requested > available };
  }

  // Switching a line's kind clears the other picker; typed values (description, qty, rate...) stay.
  // Lines loaded from a saved invoice keep their type: to change it, remove the line and add a new one.
  private readonly savedLines = new WeakSet<ItemGroup>();

  protected isSavedLine(index: number): boolean {
    return this.savedLines.has(this.items.at(index));
  }

  protected kindLabel(kind: ItemKind): string {
    return this.itemKinds.find((k) => k.value === kind)?.label ?? kind;
  }

  protected setKind(index: number, kind: ItemKind): void {
    const group = this.items.at(index);
    if (group.controls.kind.value === kind || this.savedLines.has(group)) return;
    group.patchValue({ kind, product_id: null, variant_id: null, accessory_id: null });
    group.controls.product_id.setErrors(null);
    group.controls.variant_id.setErrors(null);
    group.controls.accessory_id.setErrors(null);
    group.markAsDirty();
  }

  // Picking an accessory fills its name, HSN, rate (already before GST) and GST %. Everything stays editable.
  protected onAccessory(index: number, raw: string): void {
    const group = this.items.at(index);
    const accessoryId = raw ? Number(raw) : null;
    const accessory = this.options()?.accessories.find((a) => a.id === accessoryId);
    group.controls.accessory_id.setValue(accessoryId);
    group.controls.accessory_id.markAsTouched();
    if (!accessory) return;
    group.patchValue({
      description: accessory.name,
      hsn_sac: accessory.hsn_code,
      unit_price: accessory.price,
      gst_rate: accessory.gst_rate,
    });
  }

  // Picking a product fills its name, HSN and rate. The website price includes GST, so the
  // rate before GST is price / (1 + GST%). Everything stays editable.
  protected onProduct(index: number, raw: string): void {
    const group = this.items.at(index);
    const productId = raw ? Number(raw) : null;
    const product = this.options()?.products.find((p) => p.id === productId);
    group.controls.product_id.setValue(productId);
    group.controls.product_id.markAsTouched();
    // A new product means its combination must be picked again (a single one is picked for you).
    group.controls.variant_id.setValue(product?.variants.length === 1 ? product.variants[0].id : null);
    group.controls.variant_id.setErrors(null);
    if (!product) return;
    group.controls.hsn_sac.setValue(group.controls.hsn_sac.value || this.options()!.default_hsn);
    if (product.variants.length === 1) {
      this.applyVariant(group, product, product.variants[0]);
      return;
    }
    const gst = group.controls.gst_rate.value;
    group.patchValue({
      description: product.name,
      unit_price: product.price !== null && !product.variants.length ? round2(product.price / (1 + gst / 100)) : group.controls.unit_price.value,
    });
  }

  // Picking the combination fills "Product (1 Year)" and its rate before GST (combination prices include GST).
  protected onVariant(index: number, raw: string): void {
    const group = this.items.at(index);
    const product = this.productOf(group.controls.product_id.value);
    const variant = product?.variants.find((v) => v.id === Number(raw));
    group.controls.variant_id.setValue(variant?.id ?? null);
    group.controls.variant_id.markAsTouched();
    if (product && variant) this.applyVariant(group, product, variant);
  }

  private applyVariant(group: ItemGroup, product: VendorInvoiceOptionProduct, variant: VendorInvoiceOptionVariant): void {
    const gst = group.controls.gst_rate.value;
    group.patchValue({ description: `${product.name} (${variant.label})`, unit_price: round2(variant.price / (1 + gst / 100)) });
  }

  // Terms start as the default (INVOICE_VENDOR_TERMS on the API); this puts them back after edits.
  protected termsAreDefault(): boolean {
    const defaults = this.options()?.default_terms ?? '';
    return this.value().terms.trim() === defaults.trim();
  }

  protected useDefaultTerms(): void {
    this.form.controls.terms.setValue(this.options()?.default_terms ?? '');
    this.form.controls.terms.markAsDirty();
  }

  protected selectType(id: number): void {
    const control = this.form.controls.type_id;
    if (control.disabled || control.value === id) return;
    control.setValue(id);
    control.markAsDirty();
    control.markAsTouched();
  }

  protected setDueIn(days: number): void {
    const date = this.form.controls.invoice_date.value || todayIso();
    this.form.controls.due_date.setValue(addDays(date, days));
    this.form.markAsDirty();
  }

  protected cellError(index: number, field: ItemField): string | null {
    const control = this.items.at(index).controls[field];
    if (!control.touched || !control.errors) return null;
    if (control.hasError('server')) return control.getError('server');
    if (control.hasError('required')) {
      if (field === 'product_id') return 'Select a product';
      if (field === 'variant_id') return 'Select the combination';
      if (field === 'accessory_id') return 'Select an accessory';
      return field === 'quantity' ? 'Enter quantity' : 'Enter rate';
    }
    if (control.hasError('decimals')) return 'Max 2 decimals';
    if (control.hasError('amount')) return field === 'quantity' ? 'More than 0' : '0 or more';
    if (control.hasError('hsn')) return '4–8 digits';
    if (control.hasError('describe')) return 'Describe the item';
    if (control.hasError('maxlength')) return 'Too long';
    return 'Invalid';
  }

  protected cellClass(index: number, field: ItemField): string {
    return fieldState(!!this.cellError(index, field));
  }

  protected fieldError(field: 'type_id' | 'vendor_id' | 'invoice_date' | 'due_date' | 'notes' | 'terms'): string | null {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return null;
    if (control.hasError('server')) return control.getError('server');
    if (control.hasError('required')) {
      return field === 'type_id' ? 'Select an invoice type' : field === 'vendor_id' ? 'Select a vendor' : 'Select a date';
    }
    if (control.hasError('maxlength')) return `At most ${control.getError('maxlength').requiredLength} characters`;
    if (control.hasError('beforeInvoice')) return 'Due date cannot be before the invoice date';
    return 'Invalid';
  }

  // Product / accessory lines need their pick; custom lines need a description. Due date can't precede the invoice date.
  private validateCrossFields(): void {
    this.items.controls.forEach((group) => {
      const { kind, product_id, accessory_id, description } = group.controls;
      if (kind.value === 'product' && !product_id.value) product_id.setErrors({ required: true });
      if (kind.value === 'accessory' && !accessory_id.value) accessory_id.setErrors({ required: true });
      if (kind.value === 'custom' && !description.value.trim()) description.setErrors({ ...(description.errors ?? {}), describe: true });
    });
    const { invoice_date: date, due_date: due } = this.form.controls;
    if (due.value && date.value && due.value < date.value) due.setErrors({ beforeInvoice: true });
  }

  protected submit(): void {
    this.validateCrossFields();
    // Product lines whose product has combinations need one picked.
    this.items.controls.forEach((group, i) => {
      const c = group.controls.variant_id;
      if (group.controls.kind.value === 'product' && this.variantsOf(i).length && !c.value) {
        c.setErrors({ required: true });
        c.markAsTouched();
      }
    });
    if (this.form.invalid || !this.items.length) {
      this.form.markAllAsTouched();
      if (!this.items.length) this.error.set('Add at least one item');
      return;
    }

    const v = this.form.getRawValue();
    const payload: VendorInvoicePayload = {
      ...(this.editId ? {} : { type_id: Number(v.type_id) }),
      vendor_id: Number(v.vendor_id),
      invoice_date: v.invoice_date,
      due_date: v.due_date || null,
      notes: v.notes.trim() || null,
      terms: v.terms.trim() || null,
      items: v.items.map((item) => ({
        product_id: item.kind === 'product' ? item.product_id : null,
        variant_id: item.kind === 'product' ? item.variant_id : null,
        accessory_id: item.kind === 'accessory' ? item.accessory_id : null,
        description: item.description.trim() || null,
        hsn_sac: item.hsn_sac.trim() || null,
        quantity: item.quantity ?? 0,
        unit_price: item.unit_price ?? 0,
        gst_rate: Number(item.gst_rate),
      })),
    };

    const request = this.editId ? this.invoiceService.update(this.editId, payload) : this.invoiceService.create(payload);
    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: (res) => {
        this.saved = true;
        this.toast.success(res.message);
        this.router.navigate(['/vendor-invoices', res.data.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(err, 'Could not save the invoice'));
        applyServerErrors(this.form, getFieldErrors(err));
      },
    });
  }

  // canDeactivate: ask before leaving with unsaved changes.
  confirmDiscard(): Observable<boolean> | boolean {
    if (this.saved || !this.form.dirty) return true;
    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Discard this invoice?',
          message: 'Your changes have not been saved.',
          confirmText: 'Discard',
          danger: true,
        },
        width: '420px',
        autoFocus: false,
      })
      .afterClosed()
      .pipe(map((ok) => !!ok));
  }
}
