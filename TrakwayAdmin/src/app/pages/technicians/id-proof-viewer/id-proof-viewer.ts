import { Component, DestroyRef, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Technician } from '../../../core/models/technician.model';
import { TechnicianService } from '../../../core/services/technician.service';
import { getErrorMessage } from '../../../core/utils/http-error';

export interface IdProofViewerData {
  technician: Technician;
}

// Shows a technician's private ID proof, fetched with the admin token as a blob.
@Component({
  selector: 'app-id-proof-viewer',
  template: `
    <div class="flex max-h-[90vh] flex-col font-sans">
      <div class="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
        <div class="min-w-0">
          <h2 class="text-[18px] font-semibold text-gray-800">ID proof</h2>
          <p class="truncate text-[14px] text-gray-500">{{ data.technician.name }} · {{ data.technician.mobile }}</p>
        </div>
        <button
          type="button"
          (click)="ref.close()"
          class="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="flex min-h-[260px] flex-1 items-center justify-center overflow-auto bg-gray-50 p-4">
        @if (url(); as src) {
          <img [src]="src" [alt]="'ID proof of ' + data.technician.name" class="max-h-[70vh] max-w-full rounded object-contain" />
        } @else if (error()) {
          <p class="text-red-600">{{ error() }}</p>
        } @else {
          <svg class="h-7 w-7 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.3" stroke-width="3" />
            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          </svg>
        }
      </div>
      <p class="border-t border-gray-200 px-6 py-3 text-[13px] text-gray-500">Private document — visible to admins only. Don't share or download it unless needed.</p>
    </div>
  `,
})
export class IdProofViewer {
  protected readonly ref = inject<MatDialogRef<IdProofViewer>>(MatDialogRef);
  protected readonly data = inject<IdProofViewerData>(MAT_DIALOG_DATA);

  protected readonly url = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    inject(TechnicianService)
      .idProof(this.data.technician.id)
      .subscribe({
        next: (blob) => this.url.set(URL.createObjectURL(blob)),
        error: (err) => this.error.set(getErrorMessage(err, 'Could not load the ID proof')),
      });
    inject(DestroyRef).onDestroy(() => {
      const url = this.url();
      if (url) URL.revokeObjectURL(url);
    });
  }
}
