import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ClientLogo, ClientLogoPayload } from '../../../core/models/client-logo.model';
import { ClientLogoService } from '../../../core/services/client-logo.service';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { applyServerErrors, controlError } from '../../../core/utils/form-errors';
import { assetUrl } from '../../../core/utils/asset-url';

export interface ClientLogoFormData {
  // null = add mode.
  logo: ClientLogo | null;
}

type Field = 'name' | 'sort_order';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const LABELS: Record<Field, string> = {
  name: 'Image name',
  sort_order: 'Sort order',
};

const notBlank = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

// Add/edit dialog for a client logo. Closes with the saved ClientLogo, or undefined when cancelled.
@Component({
  selector: 'app-client-logo-form',
  imports: [ReactiveFormsModule],
  templateUrl: './client-logo-form.html',
})
export class ClientLogoForm implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly clientLogoService = inject(ClientLogoService);
  private readonly dialogRef = inject<MatDialogRef<ClientLogoForm, ClientLogo>>(MatDialogRef);
  protected readonly data = inject<ClientLogoFormData>(MAT_DIALOG_DATA);

  // Same limits as the API's client-logo.validation.js.
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(150)]],
    sort_order: [0, [Validators.required, Validators.pattern(/^-?\d+$/)]],
    is_active: [true],
  });

  protected readonly isEdit = !!this.data.logo;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly imageFile = signal<File | null>(null);
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly imageError = signal<string | null>(null);
  protected readonly dragging = signal(false);
  // File name shown in the "Choose File | No file chosen" box.
  protected readonly fileName = computed(() => {
    const file = this.imageFile();
    if (file) return file.name;
    const preview = this.imagePreview();
    return preview ? preview.split('/').pop() || 'Current logo' : 'No file chosen';
  });

  ngOnInit(): void {
    const logo = this.data.logo;
    if (logo) {
      this.form.patchValue({ name: logo.name, sort_order: logo.sort_order, is_active: logo.is_active });
      this.imagePreview.set(assetUrl(logo.image));
    }
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  protected fieldError(field: Field): string | null {
    const control = this.form.controls[field];
    return control.touched ? controlError(control, LABELS[field]) : null;
  }

  protected inputClass(field: Field): string {
    return this.fieldError(field)
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
      : 'border-gray-300 focus:border-brand-600 focus:ring-brand-600/15';
  }

  // Status is edited as a select ("active"/"inactive") but stored as the boolean is_active.
  protected onStatusChange(value: string): void {
    this.form.controls.is_active.setValue(value === 'active');
  }

  protected onImageSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (file) this.setImage(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setImage(file);
  }

  protected close(): void {
    if (!this.saving()) this.dialogRef.close();
  }

  protected submit(): void {
    const image = this.imageFile();
    // A logo is required when adding; when editing, the current one is kept unless replaced.
    if (!this.isEdit && !image) this.imageError.set('Logo image is required');
    if (this.form.invalid || (!this.isEdit && !image)) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: ClientLogoPayload = {
      name: value.name.trim(),
      sort_order: Number(value.sort_order),
      is_active: value.is_active,
    };

    this.saving.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;

    const logo = this.data.logo;
    const request = logo
      ? this.clientLogoService.update(logo.id, payload, image)
      : this.clientLogoService.create(payload, image!);

    request.subscribe({
      next: (res) => this.dialogRef.close(res.data),
      error: (err) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.error.set(getErrorMessage(err, 'Could not save client logo'));
        const fieldErrors = getFieldErrors(err);
        applyServerErrors(this.form, fieldErrors);
        if (fieldErrors['image']) this.imageError.set(fieldErrors['image']);
      },
    });
  }

  private setImage(file: File): void {
    if (!IMAGE_TYPES.includes(file.type)) {
      this.imageError.set('Image must be JPG, PNG, WEBP or GIF');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      this.imageError.set('Image must be 2 MB or smaller');
      return;
    }
    this.imageError.set(null);
    this.revokePreview();
    this.imageFile.set(file);
    this.imagePreview.set(URL.createObjectURL(file));
    // Suggest the file name (without extension) as the image name when it's still empty.
    if (!this.form.controls.name.value.trim()) {
      this.form.controls.name.setValue(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 150));
    }
  }

  private revokePreview(): void {
    const preview = this.imagePreview();
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
  }
}
