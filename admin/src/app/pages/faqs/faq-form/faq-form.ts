import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FAQ_LIMITS, Faq } from '../../../core/models/faq.model';
import { FaqService } from '../../../core/services/faq.service';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { applyServerErrors, controlError } from '../../../core/utils/form-errors';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';
import { RichEditor } from '../../../shared/rich-editor/rich-editor';

export interface FaqFormData {
  // null = add mode.
  faq: Faq | null;
}

const notBlank = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

// The editor reports an empty answer as null.
const answerRequired = (control: AbstractControl): ValidationErrors | null =>
  control.value ? null : { required: true };

// Add/edit dialog for an FAQ. Closes with the saved Faq, or undefined when cancelled.
@Component({
  selector: 'app-faq-form',
  imports: [ReactiveFormsModule, RichEditor],
  templateUrl: './faq-form.html',
})
export class FaqForm {
  private readonly fb = inject(FormBuilder);
  private readonly faqService = inject(FaqService);
  private readonly dialogRef = inject<MatDialogRef<FaqForm, Faq>>(MatDialogRef);
  protected readonly data = inject<FaqFormData>(MAT_DIALOG_DATA);

  protected readonly limits = FAQ_LIMITS;
  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly isEdit = !!this.data.faq;

  protected readonly form = this.fb.nonNullable.group({
    question: [this.data.faq?.question ?? '', [Validators.required, notBlank, Validators.maxLength(FAQ_LIMITS.maxQuestion)]],
    answer: [this.data.faq?.answer ?? (null as string | null), [answerRequired, Validators.maxLength(FAQ_LIMITS.maxAnswer)]],
    is_active: [this.data.faq?.is_active ?? true],
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected fieldError(field: 'question' | 'answer'): string | null {
    const control = this.form.controls[field];
    return control.touched ? controlError(control, field === 'question' ? 'Question' : 'Answer') : null;
  }

  protected fieldClass(field: 'question' | 'answer'): string {
    return fieldState(!!this.fieldError(field));
  }

  protected onStatusChange(value: string): void {
    this.form.controls.is_active.setValue(value === 'active');
  }

  protected close(): void {
    if (!this.saving()) this.dialogRef.close();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { question, answer, is_active } = this.form.getRawValue();
    const payload = { question: question.trim(), answer: answer ?? '', is_active };
    const faq = this.data.faq;
    const request = faq ? this.faqService.update(faq.id, payload) : this.faqService.create(payload);

    this.saving.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;
    request.subscribe({
      next: (res) => this.dialogRef.close(res.data),
      error: (err) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.error.set(getErrorMessage(err, 'Could not save FAQ'));
        applyServerErrors(this.form, getFieldErrors(err));
      },
    });
  }
}
