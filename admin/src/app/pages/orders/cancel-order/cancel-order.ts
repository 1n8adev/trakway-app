import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ORDER_LIMITS, Order } from '../../../core/models/order.model';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';

export interface CancelOrderData {
  order: Order;
}

// Asks for a cancel reason. Closes with { reason } (null = API default "Cancelled by admin"), or undefined.
@Component({
  selector: 'app-cancel-order',
  imports: [ReactiveFormsModule],
  template: `
    <div class="px-6 pt-7 pb-6 font-sans sm:px-8">
      <div class="mx-auto mb-4 flex h-[64px] w-[64px] items-center justify-center rounded-full border-[3px] border-red-200 bg-red-50 text-red-500">
        <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </div>
      <h2 class="text-center text-[22px] font-semibold text-gray-800">Cancel {{ data.order.order_no }}?</h2>
      <p class="mt-2 text-center text-[15px] leading-relaxed text-gray-500">
        The order can't be reopened after this. Its payment is marked cancelled{{ data.order.coupon_code ? ' and its use of coupon ' + data.order.coupon_code + ' is freed' : '' }}.
      </p>

      <label for="cancel-reason" class="mt-6 mb-2 block text-[15px] text-gray-700">
        Reason <span class="text-[13px] text-gray-400">(shown to the customer)</span>
      </label>
      <textarea
        id="cancel-reason"
        [formControl]="reason"
        rows="3"
        [maxlength]="maxReason"
        placeholder="e.g. Item out of stock"
        class="px-4 py-3"
        [class]="FIELD_BASE + ' ' + fieldState(reason.invalid)"
      ></textarea>
      <p class="mt-1 text-right text-[13px] text-gray-400">{{ reason.value.length }}/{{ maxReason }}</p>

      <div class="mt-5 flex flex-col-reverse justify-center gap-3 sm:flex-row">
        <button
          type="button"
          (click)="ref.close()"
          class="h-[42px] rounded-md bg-gray-100 px-6 text-[15px] font-medium text-gray-600 transition hover:bg-gray-200"
        >
          Keep Order
        </button>
        <button
          type="button"
          (click)="confirm()"
          [disabled]="reason.invalid"
          class="h-[42px] rounded-md bg-red-500 px-6 text-[15px] font-medium text-white transition hover:bg-red-600 disabled:opacity-60"
        >
          Cancel Order
        </button>
      </div>
    </div>
  `,
})
export class CancelOrder {
  protected readonly ref = inject<MatDialogRef<CancelOrder, { reason: string | null }>>(MatDialogRef);
  protected readonly data = inject<CancelOrderData>(MAT_DIALOG_DATA);

  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly fieldState = fieldState;
  protected readonly maxReason = ORDER_LIMITS.maxCancelReason;
  protected readonly reason = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(this.maxReason)] });

  protected confirm(): void {
    if (this.reason.invalid) return;
    this.ref.close({ reason: this.reason.value.trim() || null });
  }
}
