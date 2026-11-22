import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { StockItem, StockItemType, StockStatus, StockSummary } from '../../core/models/stock.model';
import { StockService } from '../../core/services/stock.service';
import { assetUrl } from '../../core/utils/asset-url';
import { getErrorMessage } from '../../core/utils/http-error';
import { StockHistoryDialog, StockHistoryData } from './stock-history/stock-history';

// Stock page: a card per product and accessory with available stock (purchased − sold).
// Click a card for its history. Read-only; adjustments and low-stock alerts come later.
@Component({
  selector: 'app-stock',
  imports: [FormsModule],
  templateUrl: './stock.html',
})
export class Stock implements OnInit {
  private readonly stockService = inject(StockService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();

  protected readonly assetUrl = assetUrl;

  protected readonly items = signal<StockItem[]>([]);
  protected readonly summary = signal<StockSummary | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected type: '' | StockItemType = '';
  protected status: '' | StockStatus = '';
  protected search = '';
  protected readonly typeTabs: { value: '' | StockItemType; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'product', label: 'Products' },
    { value: 'accessory', label: 'Accessories' },
  ];

  constructor() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe(() => this.load());
  }

  ngOnInit(): void {
    this.load();
  }

  protected get hasFilters(): boolean {
    return !!(this.search.trim() || this.status);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.stockService
      .list({ type: this.type || undefined, status: this.status || undefined, search: this.search.trim() || undefined })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.summary.set(res.summary);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load stock'));
        },
      });
  }

  protected setType(type: '' | StockItemType): void {
    if (this.type === type) return;
    this.type = type;
    this.load();
  }

  // Summary tiles double as status filters (click again to clear).
  protected setStatus(status: '' | StockStatus): void {
    this.status = this.status === status ? '' : status;
    this.load();
  }

  protected onSearch(value: string): void {
    this.search$.next(value);
  }

  protected clearFilters(): void {
    this.search = '';
    this.status = '';
    this.load();
  }

  protected statusLabel(status: StockStatus): string {
    return status === 'in_stock' ? 'In stock' : status === 'negative' ? 'Negative' : 'Out of stock';
  }

  protected statusClass(status: StockStatus): string {
    if (status === 'in_stock') return 'bg-green-50 text-green-700';
    if (status === 'negative') return 'bg-red-50 text-red-600';
    return 'bg-amber-50 text-amber-700';
  }

  protected stockClass(status: StockStatus): string {
    if (status === 'in_stock') return 'text-gray-800';
    if (status === 'negative') return 'text-red-600';
    return 'text-amber-600';
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('');
  }

  protected openHistory(item: StockItem): void {
    this.dialog.open<StockHistoryDialog, StockHistoryData>(StockHistoryDialog, {
      data: { item },
      width: '820px',
      maxWidth: '95vw',
      autoFocus: false,
    });
  }
}
