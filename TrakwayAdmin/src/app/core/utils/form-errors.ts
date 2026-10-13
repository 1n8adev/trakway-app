import { AbstractControl, FormGroup } from '@angular/forms';

// Puts API field errors ({ name: 'Category name already exists' }) on the matching controls
// as a `server` error, so <mat-error> shows them. They clear when the value changes.
export function applyServerErrors(form: FormGroup, errors: Record<string, string>): void {
  for (const [field, message] of Object.entries(errors)) {
    const control = form.get(field);
    if (!control) continue;
    control.setErrors({ ...(control.errors ?? {}), server: message });
    control.markAsTouched();
  }
}

// First readable message for a control's current error.
export function controlError(control: AbstractControl, label = 'This field'): string | null {
  if (!control.errors) return null;
  if (control.hasError('server')) return control.getError('server');
  if (control.hasError('required')) return `${label} is required`;
  if (control.hasError('email')) return `${label} is invalid`;
  if (control.hasError('maxlength')) return `${label} must be at most ${control.getError('maxlength').requiredLength} characters`;
  if (control.hasError('pattern')) return `${label} must be a whole number`;
  return `${label} is invalid`;
}
