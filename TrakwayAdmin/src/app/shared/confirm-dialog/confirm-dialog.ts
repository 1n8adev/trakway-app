import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
}

// Generic yes/no dialog. afterClosed() emits true when confirmed.
@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="px-6 pt-9 pb-7 text-center font-sans sm:px-8">
      <div
        class="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px]"
        [class]="data.danger ? 'border-red-200 bg-red-50 text-red-500' : 'border-brand-200 bg-brand-50 text-brand-500'"
      >
        <svg class="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" aria-hidden="true">
          <path d="M12 7v6" />
          <path d="M12 17h.01" />
        </svg>
      </div>
      <h2 class="text-[22px] font-semibold text-gray-800">{{ data.title }}</h2>
      <p class="mt-2 text-[15px] leading-relaxed text-gray-500">{{ data.message }}</p>
      <div class="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
        <button
          type="button"
          (click)="ref.close(false)"
          class="h-[42px] rounded-md bg-gray-100 px-6 text-[15px] font-medium text-gray-600 transition hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="button"
          (click)="ref.close(true)"
          class="h-[42px] rounded-md px-6 text-[15px] font-medium text-white transition hover:brightness-105 focus-visible:ring-4 focus-visible:outline-none"
          [class]="
            data.danger
              ? 'bg-red-500 shadow-[0_2px_6px_rgba(239,68,68,0.35)] focus-visible:ring-red-500/30'
              : 'bg-gradient-to-r from-brand-600 to-brand-500 shadow-[0_2px_6px_rgba(231,95,0,0.35)] focus-visible:ring-brand-600/30'
          "
        >
          {{ data.confirmText ?? 'Confirm' }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  protected readonly ref = inject<MatDialogRef<ConfirmDialog, boolean>>(MatDialogRef);
}
