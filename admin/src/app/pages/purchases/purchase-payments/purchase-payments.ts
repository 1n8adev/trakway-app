import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PURCHASE_LIMITS, Purchase, PurchasePayment } from '../../../core/models/purchase.model';
import { PAYMENT_STATUS_BADGE, PAYMENT_STATUS_LABEL, PaymentMethod } from '../../../core/models/vendor-invoice.model';
import { PurchaseService } from '../../../core/services/purchase.service';
import { ToastService } from '../../../core/services/toast.service';
import { formatIsoDate, todayIso } from '../../../core/utils/date';
import { applyServerErrors } from '../../../core/utils/form-errors';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { TWO_DECIMALS, round2, rupees } from '../../../core/utils/pricing';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog';

const METHODS: { value: PaymentMethod; label: string }[] = [
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

const notBlank = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value !== '' && control.value.trim() === '' ? { required: true } : null;

// Payments Trakway sends the supplier against one purchase bill: summary, record / edit form, history.
// Emits the refreshed purchase after every change (the parent keeps its bill form as it is).
@Component({
  selector: 'app-purchase-payments',
  imports: [ReactiveFormsModule],
  templateUrl: './purchase-payments.html',
})
export class PurchasePayments {
  private readonly fb = inject(FormBuilder);
  private readonly purchaseService = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly purchase = input.required<Purchase>();
  readonly changed = output<Purchase>();

  protected readonly methods = METHODS;
  protected readonly limits = PURCHASE_LIMITS;
  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly fieldState = fieldState;
  protected readonly rupees = rupees;
  protected readonly formatDate = formatIsoDate;
  protected readonly STATUS_LABEL = PAYMENT_STATUS_LABEL;
  protected readonly STATUS_BADGE = PAYMENT_STATUS_BADGE;
  protected readonly today = todayIso();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly removingId = signal<number | null>(null);
  // The payment being edited, or null when recording a new one.
  protected readonly editing = signal<PurchasePayment | null>(null);

  protected readonly payments = computed(() => this.purchase().payments ?? []);

  // Most that can go on the payment in the form: the balance, plus the edited payment's own amount.
  protected readonly maxAmount = computed(() => round2(this.purchase().balance + (this.editing()?.amount ?? 0)));
  protected readonly showForm = computed(() => !!this.editing() || this.purchase().balance > 0);

  protected readonly form = this.fb.nonNullable.group({
    paid_on: [todayIso(), Validators.required],
    amount: this.fb.control<number | null>(null, [Validators.required, positiveAmount]),
    method: this.fb.nonNullable.control<PaymentMethod>('bank_transfer'),
    reference: ['', [Validators.required, notBlank, Validators.maxLength(PURCHASE_LIMITS.maxReference)]],
    notes: ['', Validators.maxLength(PURCHASE_LIMITS.maxPaymentNotes)],
  });

  constructor() {
    // A new purchase value (loaded, saved, or after a payment change) resets the form to "pay the balance".
    effect(() => {
      const p = this.purchase();
      this.editing.set(null);
      this.resetForm(p.balance);
    });
  }

  private resetForm(balance: number): void {
    this.error.set(null);
    this.form.reset({ paid_on: todayIso(), amount: balance > 0 ? balance : null, method: 'bank_transfer', reference: '', notes: '' });
  }

  // Balance left after the i-th payment (payments are in date order).
  protected balanceAfter(index: number): number {
    const paid = this.payments().slice(0, index + 1).reduce((sum, p) => sum + p.amount, 0);
    return Math.max(round2(this.purchase().grand_total - paid), 0);
  }

  protected fieldError(field: 'paid_on' | 'amount' | 'reference' | 'notes'): string | null {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return null;
    if (control.hasError('server')) return control.getError('server');
    if (control.hasError('required')) return field === 'amount' ? 'Enter the amount' : field === 'reference' ? 'Enter the UTR / cheque no' : 'Select a date';
    if (control.hasError('decimals')) return 'At most 2 decimal places';
    if (control.hasError('amount')) return 'Must be more than 0';
    if (control.hasError('tooMuch')) return `Cannot exceed the balance (${rupees(this.maxAmount())})`;
    if (control.hasError('maxlength')) return `At most ${control.getError('maxlength').requiredLength} characters`;
    return 'Invalid';
  }

  protected edit(p: PurchasePayment): void {
    this.editing.set(p);
    this.error.set(null);
    this.form.reset({ paid_on: p.paid_on, amount: p.amount, method: p.method, reference: p.reference ?? '', notes: p.notes ?? '' });
  }

  protected cancelEdit(): void {
    this.editing.set(null);
    this.resetForm(this.purchase().balance);
  }

  protected submit(): void {
    const amount = this.form.controls.amount;
    if (amount.value !== null && round2(Number(amount.value)) > this.maxAmount()) {
      amount.setErrors({ ...(amount.errors ?? {}), tooMuch: true });
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      paid_on: v.paid_on,
      amount: Number(v.amount),
      method: v.method,
      reference: v.reference.trim(),
      notes: v.notes.trim() || null,
    };
    const id = this.purchase().id;
    const editing = this.editing();
    const request = editing ? this.purchaseService.updatePayment(id, editing.id, payload) : this.purchaseService.addPayment(id, payload);
    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toast.success(res.message);
        this.changed.emit(res.data);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(err, 'Could not save the payment'));
        applyServerErrors(this.form, getFieldErrors(err));
      },
    });
  }

  protected remove(p: PurchasePayment): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete payment?',
          message: `${rupees(p.amount)} paid on ${formatIsoDate(p.paid_on)} (${p.method_label}) will be deleted and the balance goes back up.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '440px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.removingId.set(p.id);
        this.purchaseService.removePayment(this.purchase().id, p.id).subscribe({
          next: (res) => {
            this.removingId.set(null);
            this.toast.success(res.message);
            this.changed.emit(res.data);
          },
          error: (err) => {
            this.removingId.set(null);
            this.toast.error(getErrorMessage(err, 'Could not delete the payment'));
          },
        });
      });
  }
}
