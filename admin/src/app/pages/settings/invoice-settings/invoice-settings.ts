import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { startWith } from 'rxjs';
import { InvoiceSettings, MAX_VENDOR_TERMS } from '../../../core/models/setting.model';
import { SettingService } from '../../../core/services/setting.service';
import { ToastService } from '../../../core/services/toast.service';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog';
import { InvoiceTypes } from '../invoice-types/invoice-types';

// Vendor invoice types, plus the default terms & conditions that new vendor invoices start with
// (and that print on invoices saved without terms).
@Component({
  selector: 'app-invoice-settings',
  imports: [DatePipe, ReactiveFormsModule, InvoiceTypes],
  templateUrl: './invoice-settings.html',
})
export class InvoiceSettingsPage {
  private readonly settingService = inject(SettingService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly fieldState = fieldState;
  protected readonly maxTerms = MAX_VENDOR_TERMS;

  protected readonly settings = signal<InvoiceSettings | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly terms = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(MAX_VENDOR_TERMS)],
  });
  protected readonly termsValue = toSignal(this.terms.valueChanges.pipe(startWith(this.terms.value)), { requireSync: true });

  // The numbered preview, as the PDF prints it.
  protected readonly points = computed(() =>
    this.termsValue()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );
  protected readonly dirty = computed(() => this.points().join('\n') !== (this.settings()?.vendor_terms ?? ''));

  constructor() {
    this.settingService
      .invoice()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (s) => {
          this.apply(s);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.loadError.set(getErrorMessage(err, 'Could not load invoice settings'));
        },
      });
  }

  private apply(s: InvoiceSettings): void {
    this.settings.set(s);
    this.terms.setValue(s.vendor_terms);
    this.terms.markAsPristine();
  }

  protected termsError(): string | null {
    if (!this.terms.touched || !this.terms.errors) return null;
    if (this.terms.hasError('server')) return this.terms.getError('server');
    if (this.terms.hasError('required')) return 'Enter at least one point, or restore the default terms';
    if (this.terms.hasError('maxlength')) return `At most ${MAX_VENDOR_TERMS} characters`;
    return 'Invalid';
  }

  protected save(): void {
    if (this.terms.invalid || !this.points().length) {
      this.terms.markAsTouched();
      return;
    }
    this.send(this.points().join('\n'));
  }

  protected restoreDefault(): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Restore default terms?',
          message: 'Your edited terms will be replaced with the built-in Trakway terms. Invoices already saved keep their own terms.',
          confirmText: 'Restore',
        },
        width: '460px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.send(null);
      });
  }

  protected discard(): void {
    const s = this.settings();
    if (s) this.apply(s);
  }

  private send(value: string | null): void {
    this.saving.set(true);
    this.error.set(null);
    this.settingService.updateInvoice(value).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.apply(res.data);
        this.toast.success(res.message);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(err, 'Could not save invoice settings'));
        const message = getFieldErrors(err)['vendor_terms'];
        if (message) {
          this.terms.setErrors({ server: message });
          this.terms.markAsTouched();
        }
      },
    });
  }
}
