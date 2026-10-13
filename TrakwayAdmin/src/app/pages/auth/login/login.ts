import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { applyServerErrors, controlError } from '../../../core/utils/form-errors';
import { AuthShell } from '../auth-shell/auth-shell';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthShell],
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [true],
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  // Message to show under a field, once the user has interacted with it.
  protected fieldError(field: 'email' | 'password'): string | null {
    const control = this.form.controls[field];
    return control.touched ? controlError(control, field === 'email' ? 'Email' : 'Password') : null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const { email, password, remember } = this.form.getRawValue();
    this.auth.login({ email: email.trim(), password }, remember).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        // Only follow in-app paths, never an external URL.
        this.router.navigateByUrl(returnUrl?.startsWith('/') ? returnUrl : '/products');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(getErrorMessage(err, 'Login failed'));
        applyServerErrors(this.form, getFieldErrors(err));
      },
    });
  }
}
