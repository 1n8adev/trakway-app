import { Component, DestroyRef, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { map } from 'rxjs';
import {
  TECHNICIAN_LIMITS,
  Technician,
  TechnicianPayload,
  TechnicianPhotoField,
  TechnicianPhotos,
} from '../../../core/models/technician.model';
import { ServiceBookingService } from '../../../core/services/service-booking.service';
import { TechnicianService } from '../../../core/services/technician.service';
import { assetUrl } from '../../../core/utils/asset-url';
import { applyServerErrors, controlError } from '../../../core/utils/form-errors';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { isMobile, normalizeMobile } from '../../../core/utils/phone';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';
import { PhotoPicker } from '../photo-picker/photo-picker';

export interface TechnicianFormData {
  // null = onboard a new technician.
  technician: Technician | null;
}

interface PhotoState {
  file: File | null;
  preview: string | null;
  error: string | null;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_PHOTO_SIZE = TECHNICIAN_LIMITS.maxPhotoMb * 1024 * 1024;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const notBlank = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

const mobile = (control: AbstractControl): ValidationErrors | null =>
  !control.value || isMobile(control.value) ? null : { mobile: true };

const email = (control: AbstractControl): ValidationErrors | null =>
  !control.value?.trim() || EMAIL_REGEX.test(control.value.trim()) ? null : { email: true };

const pincode = (control: AbstractControl): ValidationErrors | null =>
  !control.value || /^[1-9]\d{5}$/.test(control.value.trim()) ? null : { pincode: true };

const LABELS: Record<string, string> = {
  name: 'Name',
  mobile: 'Mobile number',
  email: 'Email',
  address: 'Address',
  state: 'State',
  pincode: 'Pincode',
};

// Onboard / edit a technician. Closes with the saved Technician, or undefined when cancelled.
@Component({
  selector: 'app-technician-form',
  imports: [ReactiveFormsModule, PhotoPicker],
  templateUrl: './technician-form.html',
})
export class TechnicianForm {
  private readonly fb = inject(FormBuilder);
  private readonly technicianService = inject(TechnicianService);
  private readonly dialogRef = inject<MatDialogRef<TechnicianForm, Technician>>(MatDialogRef);
  private readonly data = inject<TechnicianFormData>(MAT_DIALOG_DATA);

  protected readonly limits = TECHNICIAN_LIMITS;
  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly isEdit = !!this.data.technician;

  // Same state list as the booking form.
  protected readonly states = toSignal(inject(ServiceBookingService).options().pipe(map((o) => o.states)), {
    initialValue: [] as string[],
  });

  private readonly t = this.data.technician;

  protected readonly form = this.fb.nonNullable.group({
    name: [this.t?.name ?? '', [Validators.required, notBlank, Validators.maxLength(TECHNICIAN_LIMITS.maxName)]],
    mobile: [this.t?.mobile ?? '', [Validators.required, mobile]],
    email: [this.t?.email ?? '', [email, Validators.maxLength(TECHNICIAN_LIMITS.maxEmail)]],
    address: [this.t?.address ?? '', [Validators.required, notBlank, Validators.maxLength(TECHNICIAN_LIMITS.maxAddress)]],
    state: [this.t?.state ?? '', [Validators.required]],
    pincode: [this.t?.pincode ?? '', [Validators.required, pincode]],
    is_active: [this.t?.is_active ?? true],
  });

  protected readonly photos = signal<Record<TechnicianPhotoField, PhotoState>>({
    technician_photo: { file: null, preview: assetUrl(this.t?.technician_photo), error: null },
    shop_photo: { file: null, preview: assetUrl(this.t?.shop_photo), error: null },
    id_proof_photo: { file: null, preview: null, error: null },
  });
  protected readonly idProofLoading = signal(false);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // The ID proof is private: fetch it with the admin token and show it from a blob URL.
    if (this.t?.has_id_proof) {
      this.idProofLoading.set(true);
      this.technicianService.idProof(this.t.id).subscribe({
        next: (blob) => {
          this.idProofLoading.set(false);
          if (!this.photos().id_proof_photo.file) this.setPhotoState('id_proof_photo', { preview: URL.createObjectURL(blob) });
        },
        error: () => {
          this.idProofLoading.set(false);
          this.setPhotoState('id_proof_photo', { error: 'Could not load the current ID proof' });
        },
      });
    }
    inject(DestroyRef).onDestroy(() => {
      for (const p of Object.values(this.photos())) this.revoke(p.preview);
    });
  }

  protected fieldError(field: keyof typeof LABELS): string | null {
    const control = this.form.get(field)!;
    if (!control.touched || !control.errors) return null;
    if (control.hasError('mobile')) return 'Enter a valid 10-digit mobile number';
    if (control.hasError('pincode')) return 'Enter a valid 6-digit pincode';
    if (control.hasError('email')) return 'Enter a valid email address';
    return controlError(control, LABELS[field]);
  }

  protected fieldClass(field: keyof typeof LABELS): string {
    return fieldState(!!this.fieldError(field));
  }

  protected onPhoto(field: TechnicianPhotoField, file: File): void {
    if (!IMAGE_TYPES.includes(file.type)) {
      this.setPhotoState(field, { error: 'Photo must be JPG, PNG, WEBP or GIF' });
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      this.setPhotoState(field, { error: `Image must be ${TECHNICIAN_LIMITS.maxPhotoMb} MB or smaller` });
      return;
    }
    this.revoke(this.photos()[field].preview);
    this.setPhotoState(field, { file, preview: URL.createObjectURL(file), error: null });
  }

  protected close(): void {
    if (!this.saving()) this.dialogRef.close();
  }

  protected submit(): void {
    // New technicians need all three photos.
    if (!this.isEdit) {
      for (const field of ['technician_photo', 'shop_photo', 'id_proof_photo'] as const) {
        if (!this.photos()[field].file) this.setPhotoState(field, { error: 'Photo is required' });
      }
    }
    const photosMissing = !this.isEdit && Object.values(this.photos()).some((p) => !p.file);
    if (this.form.invalid || photosMissing) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const all: TechnicianPayload = {
      name: v.name.trim(),
      mobile: normalizeMobile(v.mobile),
      email: v.email.trim().toLowerCase() || null,
      address: v.address.trim(),
      state: v.state,
      pincode: v.pincode.trim(),
      is_active: v.is_active,
    };
    const files: TechnicianPhotos = {};
    for (const [field, p] of Object.entries(this.photos()) as [TechnicianPhotoField, PhotoState][]) {
      if (p.file) files[field] = p.file;
    }

    const t = this.t;
    const payload = t ? this.changes(t, all) : all;
    if (t && !Object.keys(payload).length && !Object.keys(files).length) {
      this.dialogRef.close();
      return;
    }
    const request = t ? this.technicianService.update(t.id, payload, files) : this.technicianService.create(payload, files);

    this.saving.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;
    request.subscribe({
      next: (res) => this.dialogRef.close(res.data),
      error: (err) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.error.set(getErrorMessage(err, 'Could not save technician'));
        const fieldErrors = getFieldErrors(err);
        applyServerErrors(this.form, fieldErrors);
        for (const field of ['technician_photo', 'shop_photo', 'id_proof_photo'] as const) {
          if (fieldErrors[field]) this.setPhotoState(field, { error: fieldErrors[field] });
        }
      },
    });
  }

  // PUT takes only what changed.
  private changes(t: Technician, all: TechnicianPayload): TechnicianPayload {
    const out: TechnicianPayload = {};
    for (const key of Object.keys(all) as (keyof TechnicianPayload)[]) {
      if (all[key] !== (t[key] ?? null)) (out as Record<string, unknown>)[key] = all[key];
    }
    return out;
  }

  private setPhotoState(field: TechnicianPhotoField, patch: Partial<PhotoState>): void {
    this.photos.update((all) => ({ ...all, [field]: { ...all[field], ...patch } }));
  }

  private revoke(url: string | null): void {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }
}
