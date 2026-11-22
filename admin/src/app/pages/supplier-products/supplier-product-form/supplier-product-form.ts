import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { startWith } from 'rxjs';
import { SUPPLIER_PRODUCT_LIMITS, GST_RATES, SupplierProduct, SupplierProductPayload } from '../../../core/models/supplier-product.model';
import { Supplier } from '../../../core/models/supplier.model';
import { SupplierProductService } from '../../../core/services/supplier-product.service';
import { applyServerErrors, controlError } from '../../../core/utils/form-errors';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { TWO_DECIMALS, round2, rupees } from '../../../core/utils/pricing';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';

export interface SupplierProductFormData {
  // null = add a new product.
  product: SupplierProduct | null;
  // Active suppliers to pick from when adding.
  suppliers: Supplier[];
  // Preselected supplier when adding (the list's supplier filter).
  supplierId: number | null;
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

const LABELS: Record<string, string> = { supplier_id: 'Supplier', name: 'Name', price: 'Price', hsn_code: 'HSN code', gst_rate: 'GST' };

// Add / edit a product product. Closes with the saved product, or undefined when cancelled.
@Component({
  selector: 'app-supplier-product-form',
  imports: [ReactiveFormsModule],
  templateUrl: './supplier-product-form.html',
})
export class SupplierProductForm {
  private readonly fb = inject(FormBuilder);
  private readonly supplierProductService = inject(SupplierProductService);
  private readonly dialogRef = inject<MatDialogRef<SupplierProductForm, SupplierProduct>>(MatDialogRef);
  private readonly data = inject<SupplierProductFormData>(MAT_DIALOG_DATA);

  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly limits = SUPPLIER_PRODUCT_LIMITS;
  protected readonly gstRates = GST_RATES;
  protected readonly rupees = rupees;
  protected readonly isEdit = !!this.data.product;

  private readonly a = this.data.product;
  protected readonly suppliers = this.data.suppliers;
  // On edit the supplier is fixed; show its name instead of a picker.
  protected readonly supplierName = this.a?.supplier_name ?? '';

  protected readonly form = this.fb.group({
    supplier_id: this.fb.control<number | null>(
      this.a?.supplier_id ?? (this.data.suppliers.some((s) => s.id === this.data.supplierId) ? this.data.supplierId : null),
      this.a ? [] : [Validators.required],
    ),
    name: this.fb.nonNullable.control(this.a?.name ?? '', [Validators.required, notBlank, Validators.maxLength(SUPPLIER_PRODUCT_LIMITS.maxName)]),
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
    const all: Omit<Required<SupplierProductPayload>, 'supplier_id'> = {
      name: f.name.trim(),
      price: Number(f.price),
      hsn_code: f.hsn_code.trim(),
      gst_rate: Number(f.gst_rate),
      is_active: f.is_active,
    };
    const a = this.a;
    // PUT takes only what changed.
    const payload: SupplierProductPayload = a
      ? Object.fromEntries(Object.entries(all).filter(([key, value]) => value !== a[key as keyof SupplierProduct]))
      : { ...all, supplier_id: Number(f.supplier_id) };
    if (a && !Object.keys(payload).length) {
      this.dialogRef.close();
      return;
    }
    const request = a ? this.supplierProductService.update(a.id, payload) : this.supplierProductService.create(payload);
    this.saving.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;
    request.subscribe({
      next: (res) => this.dialogRef.close(res.data),
      error: (err) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.error.set(getErrorMessage(err, 'Could not save the supplier product'));
        applyServerErrors(this.form, getFieldErrors(err));
      },
    });
  }
}
