import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { COUPON_LIMITS, Coupon, CouponPayload, DiscountType } from '../../../core/models/coupon.model';
import { CouponService } from '../../../core/services/coupon.service';
import { isoToLocalInput, localInputToIso } from '../../../core/utils/date';
import { applyServerErrors, controlError } from '../../../core/utils/form-errors';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { TWO_DECIMALS, rawNumber, rupees } from '../../../core/utils/pricing';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';

export interface CouponFormData {
  // null = new coupon.
  coupon: Coupon | null;
}

// Amount fields: empty is allowed (required is a separate validator); otherwise >= min with at most 2 decimals.
const money =
  (min: number, message: string) =>
  (control: AbstractControl): ValidationErrors | null => {
    const raw = rawNumber(control.value);
    if (raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > COUPON_LIMITS.maxAmount) return { money: message };
    return TWO_DECIMALS.test(raw) ? null : { money: 'At most 2 decimal places' };
  };

// Usage limits: empty = unlimited, otherwise a whole number >= 1.
const limit = (control: AbstractControl): ValidationErrors | null => {
  const raw = rawNumber(control.value);
  return raw === '' || (/^\d+$/.test(raw) && Number(raw) >= 1) ? null : { money: 'Whole number of 1 or more' };
};

const code = (control: AbstractControl): ValidationErrors | null =>
  !control.value || COUPON_LIMITS.codePattern.test(control.value) ? null : { money: '3–30 letters, numbers, - or _' };

// Same cross-field rules as the API's checkCombined().
const combined = (group: AbstractControl): ValidationErrors | null => {
  const errors: ValidationErrors = {};
  const value = Number(rawNumber(group.get('discount_value')?.value));
  if (group.get('discount_type')?.value === 'percentage' && value > 100) errors['percentOver'] = true;
  const start = group.get('starts_at')?.value;
  const end = group.get('expires_at')?.value;
  if (start && end && new Date(end) <= new Date(start)) errors['expiryBeforeStart'] = true;
  return Object.keys(errors).length ? errors : null;
};

// Readable, no look-alike characters (0/O, 1/I).
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const LABELS = {
  code: 'Coupon code',
  description: 'Description',
  discount_value: 'Discount',
  max_discount: 'Max discount',
  min_order_amount: 'Minimum order',
  starts_at: 'Start',
  expires_at: 'Expiry',
  usage_limit: 'Total uses',
  per_user_limit: 'Uses per customer',
} as const;

type Field = keyof typeof LABELS;

// Add / edit a coupon. Closes with the saved Coupon, or undefined when cancelled or unchanged.
@Component({
  selector: 'app-coupon-form',
  imports: [ReactiveFormsModule],
  templateUrl: './coupon-form.html',
})
export class CouponForm {
  private readonly fb = inject(FormBuilder);
  private readonly couponService = inject(CouponService);
  private readonly dialogRef = inject<MatDialogRef<CouponForm, Coupon>>(MatDialogRef);
  private readonly data = inject<CouponFormData>(MAT_DIALOG_DATA);

  protected readonly c = this.data.coupon;
  protected readonly isEdit = !!this.c;
  protected readonly limits = COUPON_LIMITS;
  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly types: { value: DiscountType; label: string; hint: string }[] = [
    { value: 'percentage', label: 'Percentage', hint: 'e.g. 10% off' },
    { value: 'fixed', label: 'Fixed amount', hint: 'e.g. ₹200 off' },
  ];

  protected readonly form = this.fb.nonNullable.group(
    {
      code: [this.c?.code ?? '', [Validators.required, code]],
      description: [this.c?.description ?? '', [Validators.maxLength(COUPON_LIMITS.maxDescription)]],
      discount_type: [(this.c?.discount_type ?? 'percentage') as DiscountType],
      discount_value: [rawNumber(this.c?.discount_value), [Validators.required, money(0.01, 'Must be more than 0')]],
      max_discount: [rawNumber(this.c?.max_discount), [money(0.01, 'Must be more than 0')]],
      min_order_amount: [this.c?.min_order_amount ? rawNumber(this.c.min_order_amount) : '', [money(0, 'Must be 0 or more')]],
      starts_at: [isoToLocalInput(this.c?.starts_at)],
      expires_at: [isoToLocalInput(this.c?.expires_at)],
      usage_limit: [rawNumber(this.c?.usage_limit), [limit]],
      per_user_limit: [rawNumber(this.c?.per_user_limit), [limit]],
      is_active: [this.c?.is_active ?? true],
    },
    { validators: combined },
  );

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly isPercentage = computed(() => this.value().discount_type === 'percentage');

  // Mirrors the API's couponSummary() so the admin sees what customers will read.
  protected readonly preview = computed(() => {
    const v = this.value();
    const amount = Number(rawNumber(v.discount_value));
    if (!rawNumber(v.discount_value) || !Number.isFinite(amount) || amount <= 0) return null;
    const cap = Number(rawNumber(v.max_discount));
    const off =
      v.discount_type === 'percentage'
        ? `${amount}% off${cap > 0 ? ` (up to ${rupees(cap)})` : ''}`
        : `${rupees(amount)} off`;
    const min = Number(rawNumber(v.min_order_amount));
    return min > 0 ? `${off} on orders of ${rupees(min)} or more` : off;
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected fieldError(field: Field): string | null {
    const control = this.form.controls[field];
    if (field === 'discount_value' && control.touched && this.form.hasError('percentOver')) return 'Percentage cannot be more than 100';
    if (field === 'expires_at' && (control.touched || this.form.controls.starts_at.touched) && this.form.hasError('expiryBeforeStart')) {
      return 'Expiry must be after the start';
    }
    if (!control.touched || !control.errors) return null;
    if (control.hasError('money')) return control.getError('money');
    return controlError(control, LABELS[field]);
  }

  protected fieldClass(field: Field): string {
    return fieldState(!!this.fieldError(field));
  }

  protected setType(type: DiscountType): void {
    this.form.controls.discount_type.setValue(type);
    this.form.controls.discount_value.markAsTouched();
  }

  // Codes are stored upper-case; show them that way while typing.
  protected onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase().replace(/\s+/g, '');
    if (upper !== input.value) this.form.controls.code.setValue(upper);
  }

  protected generateCode(): void {
    const random = crypto.getRandomValues(new Uint32Array(8));
    const value = Array.from(random, (n) => CODE_CHARS[n % CODE_CHARS.length]).join('');
    this.form.controls.code.setValue(value);
    this.form.controls.code.markAsTouched();
  }

  protected close(): void {
    if (!this.saving()) this.dialogRef.close();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const optionalNumber = (raw: string) => (rawNumber(raw) === '' ? null : Number(rawNumber(raw)));
    const all: CouponPayload = {
      code: v.code.trim().toUpperCase(),
      description: v.description.trim() || null,
      discount_type: v.discount_type,
      discount_value: Number(rawNumber(v.discount_value)),
      // A cap only makes sense for percentage coupons.
      max_discount: v.discount_type === 'percentage' ? optionalNumber(v.max_discount) : null,
      min_order_amount: optionalNumber(v.min_order_amount) ?? 0,
      starts_at: localInputToIso(v.starts_at),
      expires_at: localInputToIso(v.expires_at),
      usage_limit: optionalNumber(v.usage_limit),
      per_user_limit: optionalNumber(v.per_user_limit),
      is_active: v.is_active,
    };

    const c = this.c;
    const payload = c ? this.changes(c, all) : all;
    if (c && !Object.keys(payload).length) {
      this.dialogRef.close();
      return;
    }
    const request = c ? this.couponService.update(c.id, payload) : this.couponService.create(payload);

    this.saving.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;
    request.subscribe({
      next: (res) => this.dialogRef.close(res.data),
      error: (err) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.error.set(getErrorMessage(err, 'Could not save coupon'));
        applyServerErrors(this.form, getFieldErrors(err));
      },
    });
  }

  // PUT takes only what changed. Dates compare at minute precision, like the input shows them.
  private changes(c: Coupon, all: CouponPayload): CouponPayload {
    const v = this.form.getRawValue();
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(all) as (keyof CouponPayload)[]) {
      if (key === 'starts_at' || key === 'expires_at') {
        if (v[key] !== isoToLocalInput(c[key])) out[key] = all[key];
      } else if (all[key] !== (c[key] ?? null)) {
        out[key] = all[key];
      }
    }
    return out as CouponPayload;
  }
}
