import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { StockHistory, StockItem, StockMovement, StockMovementKind } from '../../../core/models/stock.model';
import { StockService } from '../../../core/services/stock.service';
import { assetUrl } from '../../../core/utils/asset-url';
import { formatIsoDate } from '../../../core/utils/date';
import { getErrorMessage } from '../../../core/utils/http-error';

export interface StockHistoryData {
  item: StockItem;
}

// One item's stock history: every purchase (+), vendor invoice (−) and website order (−), newest first,
// with the balance after each. Rows open the purchase / invoice / order.
@Component({
  selector: 'app-stock-history',
  templateUrl: './stock-history.html',
})
export class StockHistoryDialog {
  private readonly stockService = inject(StockService);
  private readonly router = inject(Router);
  private readonly dialogRef = inject<MatDialogRef<StockHistoryDialog>>(MatDialogRef);
  protected readonly data = inject<StockHistoryData>(MAT_DIALOG_DATA);

  protected readonly assetUrl = assetUrl;
  protected readonly formatDate = formatIsoDate;

  protected readonly history = signal<StockHistory | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly kind = signal<'' | StockMovementKind>('');

  protected readonly item = computed(() => this.history()?.item ?? this.data.item);
  protected readonly movements = computed(() => {
    const k = this.kind();
    return (this.history()?.movements ?? []).filter((m) => !k || m.kind === k);
  });

  protected readonly kinds: { value: '' | StockMovementKind; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'purchase', label: 'Purchases' },
    { value: 'invoice', label: 'Vendor invoices' },
    { value: 'order', label: 'Website orders' },
  ];

  constructor() {
    this.stockService.history(this.data.item.type, this.data.item.id).subscribe({
      next: (h) => {
        this.history.set(h);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(getErrorMessage(err, 'Could not load the history'));
      },
    });
  }

  protected kindLabel(kind: StockMovementKind): string {
    return kind === 'purchase' ? 'Purchase' : kind === 'invoice' ? 'Vendor invoice' : 'Website order';
  }

  protected kindClass(kind: StockMovementKind): string {
    if (kind === 'purchase') return 'bg-green-50 text-green-700';
    if (kind === 'invoice') return 'bg-brand-100 text-brand-600';
    return 'bg-blue-50 text-blue-700';
  }

  protected open(m: StockMovement): void {
    const path = m.kind === 'purchase' ? ['/purchases', m.ref_id, 'edit'] : m.kind === 'invoice' ? ['/vendor-invoices', m.ref_id] : ['/orders', m.ref_id];
    this.dialogRef.close();
    this.router.navigate(path);
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
