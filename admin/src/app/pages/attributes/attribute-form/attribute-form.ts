import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Attribute } from '../../../core/models/attribute.model';
import { AttributeService } from '../../../core/services/attribute.service';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { applyServerErrors, controlError } from '../../../core/utils/form-errors';

export interface AttributeFormData {
  // null = add mode.
  attribute: Attribute | null;
}

type Field = 'name' | 'sort_order';

// Same limits as the API's attribute.validation.js.
const MAX_TEXT = 100;
const MAX_VALUES = 100;

const notBlank = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

// Add/edit dialog for an attribute. Closes with the saved Attribute, or undefined when cancelled.
// In add mode the first values can be typed as tags; in edit mode values are managed in the Values dialog.
@Component({
  selector: 'app-attribute-form',
  imports: [ReactiveFormsModule],
  templateUrl: './attribute-form.html',
})
export class AttributeForm {
  private readonly fb = inject(FormBuilder);
  private readonly attributeService = inject(AttributeService);
  private readonly dialogRef = inject<MatDialogRef<AttributeForm, Attribute>>(MatDialogRef);
  protected readonly data = inject<AttributeFormData>(MAT_DIALOG_DATA);

  protected readonly isEdit = !!this.data.attribute;

  protected readonly form = this.fb.nonNullable.group({
    name: [this.data.attribute?.name ?? '', [Validators.required, notBlank, Validators.maxLength(MAX_TEXT)]],
    sort_order: [this.data.attribute?.sort_order ?? 0, [Validators.required, Validators.pattern(/^-?\d+$/)]],
    is_active: [this.data.attribute?.is_active ?? true],
  });

  protected readonly values = signal<string[]>([]);
  protected readonly valueDraft = signal('');
  protected readonly valuesError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected fieldError(field: Field): string | null {
    const control = this.form.controls[field];
    return control.touched ? controlError(control, field === 'name' ? 'Name' : 'Sort order') : null;
  }

  protected inputClass(field: Field): string {
    return this.fieldError(field)
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
      : 'border-gray-300 focus:border-brand-600 focus:ring-brand-600/15';
  }

  protected onStatusChange(value: string): void {
    this.form.controls.is_active.setValue(value === 'active');
  }

  // Enter or comma turns the typed text into a value tag; Backspace on an empty box removes the last tag.
  protected onValueKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commitDraft();
    } else if (event.key === 'Backspace' && !this.valueDraft() && this.values().length) {
      this.values.update((list) => list.slice(0, -1));
    }
  }

  // Pasting "Vodafone Sim, Airtel Sim" adds both.
  protected onValuePaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    if (!text.includes(',') && !text.includes('\n')) return;
    event.preventDefault();
    for (const part of text.split(/[,\n]/)) this.addValue(part);
  }

  protected commitDraft(): void {
    if (this.addValue(this.valueDraft())) this.valueDraft.set('');
  }

  protected removeValue(index: number): void {
    this.values.update((list) => list.filter((_, i) => i !== index));
    this.valuesError.set(null);
  }

  protected close(): void {
    if (!this.saving()) this.dialogRef.close();
  }

  protected submit(): void {
    if (this.valueDraft().trim()) this.commitDraft();
    if (this.form.invalid || (this.valueDraft().trim() && this.valuesError())) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, sort_order, is_active } = this.form.getRawValue();
    const base = { name: name.trim(), sort_order: Number(sort_order), is_active };
    const attribute = this.data.attribute;
    const request = attribute
      ? this.attributeService.update(attribute.id, base)
      : this.attributeService.create({ ...base, values: this.values() });

    this.saving.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;

    request.subscribe({
      next: (res) => this.dialogRef.close(res.data),
      error: (err) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.error.set(getErrorMessage(err, 'Could not save attribute'));
        const fieldErrors = getFieldErrors(err);
        applyServerErrors(this.form, fieldErrors);
        if (fieldErrors['values']) this.valuesError.set(fieldErrors['values']);
      },
    });
  }

  // Returns false (and shows why) when the text can't be added.
  private addValue(raw: string): boolean {
    const value = raw.trim();
    if (!value) return true;
    if (value.length > MAX_TEXT) {
      this.valuesError.set(`Each value must be at most ${MAX_TEXT} characters`);
      return false;
    }
    if (this.values().some((v) => v.toLowerCase() === value.toLowerCase())) {
      this.valuesError.set(`"${value}" is already added`);
      return false;
    }
    if (this.values().length >= MAX_VALUES) {
      this.valuesError.set(`At most ${MAX_VALUES} values are allowed`);
      return false;
    }
    this.values.update((list) => [...list, value]);
    this.valuesError.set(null);
    return true;
  }
}
