import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { map } from 'rxjs';
import { GSTIN_REGEX, SUPPLIER_LIMITS, Supplier, SupplierPayload } from '../../../core/models/supplier.model';
import { ServiceBookingService } from '../../../core/services/service-booking.service';
import { SupplierService } from '../../../core/services/supplier.service';
import { applyServerErrors, controlError } from '../../../core/utils/form-errors';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { isMobile, normalizeMobile } from '../../../core/utils/phone';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';

export interface SupplierFormData {
  // null = add a new supplier.
  supplier: Supplier | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const notBlank = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

const mobile = (control: AbstractControl): ValidationErrors | null =>
  !control.value || isMobile(control.value) ? null : { mobile: true };

const email = (control: AbstractControl): ValidationErrors | null =>
  !control.value?.trim() || EMAIL_REGEX.test(control.value.trim()) ? null : { email: true };

const pincode = (control: AbstractControl): ValidationErrors | null =>
  !control.value || /^[1-9]\d{5}$/.test(control.value.trim()) ? null : { pincode: true };

const gstin = (control: AbstractControl): ValidationErrors | null =>
  !control.value?.trim() || GSTIN_REGEX.test(control.value.trim().toUpperCase()) ? null : { gstin: true };

const LABELS: Record<string, string> = {
  name: 'Business name',
  contact_person: 'Contact person',
  mobile: 'Mobile number',
  email: 'Email',
  gstin: 'GSTIN',
  address: 'Address',
  city: 'City',
  state: 'State',
  pincode: 'Pincode',
  notes: 'Notes',
};

// Add / edit a supplier. Closes with the saved Supplier, or undefined when cancelled.
@Component({
  selector: 'app-supplier-form',
  imports: [ReactiveFormsModule],
  templateUrl: './supplier-form.html',
})
export class SupplierForm {
  private readonly fb = inject(FormBuilder);
  private readonly supplierService = inject(SupplierService);
  private readonly dialogRef = inject<MatDialogRef<SupplierForm, Supplier>>(MatDialogRef);
  private readonly data = inject<SupplierFormData>(MAT_DIALOG_DATA);

  protected readonly limits = SUPPLIER_LIMITS;
  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly isEdit = !!this.data.supplier;

  protected readonly states = toSignal(inject(ServiceBookingService).options().pipe(map((o) => o.states)), {
    initialValue: [] as string[],
  });

  private readonly v = this.data.supplier;

  protected readonly form = this.fb.nonNullable.group({
    name: [this.v?.name ?? '', [Validators.required, notBlank, Validators.maxLength(SUPPLIER_LIMITS.maxName)]],
    contact_person: [this.v?.contact_person ?? '', [Validators.maxLength(SUPPLIER_LIMITS.maxContact)]],
    mobile: [this.v?.mobile ?? '', [Validators.required, mobile]],
    email: [this.v?.email ?? '', [email, Validators.maxLength(SUPPLIER_LIMITS.maxEmail)]],
    gstin: [this.v?.gstin ?? '', [gstin]],
    address: [this.v?.address ?? '', [Validators.required, notBlank, Validators.maxLength(SUPPLIER_LIMITS.maxAddress)]],
    city: [this.v?.city ?? '', [Validators.required, notBlank, Validators.maxLength(SUPPLIER_LIMITS.maxCity)]],
    state: [this.v?.state ?? '', [Validators.required]],
    pincode: [this.v?.pincode ?? '', [Validators.required, pincode]],
    notes: [this.v?.notes ?? '', [Validators.maxLength(SUPPLIER_LIMITS.maxNotes)]],
    is_active: [this.v?.is_active ?? true],
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected fieldError(field: keyof typeof LABELS): string | null {
    const control = this.form.get(field)!;
    if (!control.touched || !control.errors) return null;
    if (control.hasError('mobile')) return 'Enter a valid 10-digit mobile number';
    if (control.hasError('pincode')) return 'Enter a valid 6-digit pincode';
    if (control.hasError('email')) return 'Enter a valid email address';
    if (control.hasError('gstin')) return 'Enter a valid 15-character GSTIN, e.g. 33AARCP3452D2ZG';
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
    const all: SupplierPayload = {
      name: f.name.trim(),
      contact_person: f.contact_person.trim() || null,
      mobile: normalizeMobile(f.mobile),
      email: f.email.trim().toLowerCase() || null,
      gstin: f.gstin.trim().toUpperCase() || null,
      address: f.address.trim(),
      city: f.city.trim(),
      state: f.state,
      pincode: f.pincode.trim(),
      notes: f.notes.trim() || null,
      is_active: f.is_active,
    };

    const v = this.v;
    const payload = v ? this.changes(v, all) : all;
    if (v && !Object.keys(payload).length) {
      this.dialogRef.close();
      return;
    }
    const request = v ? this.supplierService.update(v.id, payload) : this.supplierService.create(payload);

    this.saving.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;
    request.subscribe({
      next: (res) => this.dialogRef.close(res.data),
      error: (err) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.error.set(getErrorMessage(err, 'Could not save supplier'));
        applyServerErrors(this.form, getFieldErrors(err));
      },
    });
  }

  // PUT takes only what changed.
  private changes(v: Supplier, all: SupplierPayload): SupplierPayload {
    const out: SupplierPayload = {};
    for (const key of Object.keys(all) as (keyof SupplierPayload)[]) {
      if (all[key] !== (v[key] ?? null)) (out as Record<string, unknown>)[key] = all[key];
    }
    return out;
  }
}
