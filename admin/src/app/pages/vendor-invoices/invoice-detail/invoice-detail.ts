import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import {
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABEL,
  PaymentMethod,
  VENDOR_INVOICE_LIMITS,
  VendorInvoice,
  VendorInvoicePayment,
} from '../../../core/models/vendor-invoice.model';
import { ToastService } from '../../../core/services/toast.service';
import { VendorInvoiceService } from '../../../core/services/vendor-invoice.service';
import { formatIsoDate, todayIso } from '../../../core/utils/date';
import { blobErrorMessage, fileNameFrom, saveBlob } from '../../../core/utils/download';
import { applyServerErrors } from '../../../core/utils/form-errors';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { TWO_DECIMALS, round2, rupees, signedRupees } from '../../../core/utils/pricing';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const positiveAmount = (control: AbstractControl): ValidationErrors | null => {
  const v = control.value;
  if (v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return { amount: true };
  return TWO_DECIMALS.test(String(v)) ? null : { decimals: true };
};

// One vendor invoice: details, PDF download, payments received, edit / cancel.
@Component({
  selector: 'app-invoice-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './invoice-detail.html',
})
export class InvoiceDetail {
  private readonly invoiceService = inject(VendorInvoiceService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly fieldState = fieldState;
  protected readonly rupees = rupees;
  protected readonly signedRupees = signedRupees;
  protected readonly formatIsoDate = formatIsoDate;
  protected readonly PAYMENT_STATUS_LABEL = PAYMENT_STATUS_LABEL;
  protected readonly PAYMENT_STATUS_BADGE = PAYMENT_STATUS_BADGE;
  protected readonly methods = PAYMENT_METHODS;
  protected readonly limits = VENDOR_INVOICE_LIMITS;
  protected readonly today = todayIso();

  protected readonly invoice = signal<VendorInvoice | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pdfBusy = signal(false);
  protected readonly cancelBusy = signal(false);
  protected readonly paymentSaving = signal(false);
  protected readonly paymentError = signal<string | null>(null);
  protected readonly removingPaymentId = signal<number | null>(null);

  protected readonly isIssued = computed(() => this.invoice()?.status === 'issued');
  protected readonly canTakePayment = computed(() => this.isIssued() && (this.invoice()?.balance ?? 0) > 0);
  protected readonly overdue = computed(() => {
    const inv = this.invoice();
    return !!inv && inv.status === 'issued' && inv.balance > 0 && !!inv.due_date && inv.due_date < this.today;
  });

  protected readonly payment = this.fb.nonNullable.group({
    paid_on: [todayIso(), Validators.required],
    amount: this.fb.control<number | null>(null, [Validators.required, positiveAmount]),
    method: this.fb.nonNullable.control<PaymentMethod>('bank_transfer'),
    reference: ['', Validators.maxLength(VENDOR_INVOICE_LIMITS.maxReference)],
  });

  constructor() {
    this.invoiceService
      .getById(this.id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (inv) => {
          this.setInvoice(inv);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load the invoice'));
        },
      });
  }

  // The amount field defaults to the balance still due.
  private setInvoice(inv: VendorInvoice): void {
    this.invoice.set(inv);
    this.payment.reset({ paid_on: todayIso(), amount: inv.balance > 0 ? inv.balance : null, method: 'bank_transfer', reference: '' });
  }

  // Balance left after the i-th payment (payments are in date order), e.g. 9000 − 5000 → 4000.
  protected balanceAfter(index: number): number {
    const inv = this.invoice();
    if (!inv) return 0;
    const paidSoFar = inv.payments.slice(0, index + 1).reduce((sum, p) => sum + p.amount, 0);
    return Math.max(round2(inv.grand_total - paidSoFar), 0);
  }

  protected paymentFieldError(field: 'paid_on' | 'amount' | 'reference'): string | null {
    const control = this.payment.controls[field];
    if (!control.touched || !control.errors) return null;
    if (control.hasError('server')) return control.getError('server');
    if (control.hasError('required')) return field === 'amount' ? 'Enter the amount' : 'Select a date';
    if (control.hasError('decimals')) return 'At most 2 decimal places';
    if (control.hasError('amount')) return 'Must be more than 0';
    if (control.hasError('tooMuch')) return `Cannot exceed the balance (${rupees(this.invoice()?.balance)})`;
    if (control.hasError('maxlength')) return `At most ${control.getError('maxlength').requiredLength} characters`;
    return 'Invalid';
  }

  protected downloadPdf(): void {
    const inv = this.invoice();
    if (!inv || this.pdfBusy()) return;
    this.pdfBusy.set(true);
    this.invoiceService.pdf(inv.id).subscribe({
      next: (res) => {
        this.pdfBusy.set(false);
        if (res.body) saveBlob(res.body, fileNameFrom(res.headers.get('Content-Disposition'), `Invoice-${inv.invoice_no.replace(/\//g, '-')}.pdf`));
      },
      error: async (err) => {
        this.pdfBusy.set(false);
        this.toast.error(await blobErrorMessage(err, 'Could not download the invoice'));
      },
    });
  }

  protected recordPayment(): void {
    const inv = this.invoice();
    if (!inv) return;
    const amount = this.payment.controls.amount;
    if (amount.value !== null && round2(Number(amount.value)) > inv.balance) {
      amount.setErrors({ ...(amount.errors ?? {}), tooMuch: true });
    }
    if (this.payment.invalid) {
      this.payment.markAllAsTouched();
      return;
    }
    const v = this.payment.getRawValue();
    this.paymentSaving.set(true);
    this.paymentError.set(null);
    this.invoiceService
      .addPayment(inv.id, { paid_on: v.paid_on, amount: v.amount ?? 0, method: v.method, reference: v.reference.trim() || null })
      .subscribe({
        next: (res) => {
          this.paymentSaving.set(false);
          this.toast.success(res.message);
          this.setInvoice(res.data);
        },
        error: (err) => {
          this.paymentSaving.set(false);
          this.paymentError.set(getErrorMessage(err, 'Could not record the payment'));
          applyServerErrors(this.payment, getFieldErrors(err));
        },
      });
  }

  protected removePayment(p: VendorInvoicePayment): void {
    const inv = this.invoice();
    if (!inv) return;
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Remove payment?',
          message: `${rupees(p.amount)} received on ${formatIsoDate(p.paid_on)} (${p.method_label}) will be removed and the balance goes back up.`,
          confirmText: 'Remove',
          danger: true,
        },
        width: '440px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.removingPaymentId.set(p.id);
        this.invoiceService.removePayment(inv.id, p.id).subscribe({
          next: (res) => {
            this.removingPaymentId.set(null);
            this.toast.success(res.message);
            this.setInvoice(res.data);
          },
          error: (err) => {
            this.removingPaymentId.set(null);
            this.toast.error(getErrorMessage(err, 'Could not remove the payment'));
          },
        });
      });
  }

  protected confirmCancel(): void {
    const inv = this.invoice();
    if (!inv) return;
    if (inv.amount_paid > 0) {
      this.toast.error('This invoice has payments. Remove them before cancelling.');
      return;
    }
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: `Cancel ${inv.invoice_no}?`,
          message: 'The invoice is kept for your records and marked cancelled. Its number is not reused, and it can no longer be edited or paid.',
          confirmText: 'Cancel invoice',
          danger: true,
        },
        width: '460px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.cancelBusy.set(true);
        this.invoiceService.cancel(inv.id).subscribe({
          next: (res) => {
            this.cancelBusy.set(false);
            this.toast.success(res.message);
            this.setInvoice(res.data);
          },
          error: (err) => {
            this.cancelBusy.set(false);
            this.toast.error(getErrorMessage(err, 'Could not cancel the invoice'));
          },
        });
      });
  }
}
