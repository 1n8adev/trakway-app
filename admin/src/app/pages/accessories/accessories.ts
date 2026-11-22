import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Pagination } from '../../core/models/api.model';
import { ProductAccessory } from '../../core/models/product-accessory.model';
import { ProductAccessoryService } from '../../core/services/product-accessory.service';
import { ToastService } from '../../core/services/toast.service';
import { getErrorMessage } from '../../core/utils/http-error';
import { round2, rupees } from '../../core/utils/pricing';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { AccessoryForm, AccessoryFormData } from './accessory-form/accessory-form';

// Product accessories master: name, price (before GST), HSN and GST %. Active ones can be added to vendor invoices.
@Component({
  selector: 'app-accessories',
  imports: [FormsModule],
  templateUrl: './accessories.html',
})
export class Accessories implements OnInit {
  private readonly accessoryService = inject(ProductAccessoryService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();

  private readonly limit = 20;

  protected readonly rupees = rupees;

  protected readonly accessories = signal<ProductAccessory[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  protected search = '';
  protected status: '' | 'active' | 'inactive' = '';
  protected page = 1;

  constructor() {
    this.search$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed()).subscribe(() => {
      this.page = 1;
      this.load();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  protected get hasFilters(): boolean {
    return !!(this.search.trim() || this.status);
  }

  protected withGst(a: ProductAccessory): number {
    return round2(a.price * (1 + a.gst_rate / 100));
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.accessoryService
      .list({ page: this.page, limit: this.limit, search: this.search.trim() || undefined, status: this.status || undefined })
      .subscribe({
        next: (res) => {
          this.accessories.set(res.data);
          this.pagination.set(res.pagination);
          this.loading.set(false);
          if (!res.data.length && this.page > 1) {
            this.page--;
            this.load();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load accessories'));
        },
      });
  }

  protected onSearch(value: string): void {
    this.search$.next(value);
  }

  protected onFilterChange(): void {
    this.page = 1;
    this.load();
  }

  protected clearFilters(): void {
    this.search = '';
    this.status = '';
    this.onFilterChange();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  // accessory null = add.
  protected openForm(accessory: ProductAccessory | null = null): void {
    this.dialog
      .open<AccessoryForm, AccessoryFormData, ProductAccessory>(AccessoryForm, {
        data: { accessory },
        width: '720px',
        autoFocus: '#accessory-name',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.toast.success(accessory ? 'Accessory updated' : 'Accessory added');
        this.load();
      });
  }

  protected toggleStatus(accessory: ProductAccessory): void {
    this.busyId.set(accessory.id);
    this.accessoryService.setStatus(accessory.id, !accessory.is_active).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.toast.success(res.message);
        this.accessories.update((list) => list.map((a) => (a.id === accessory.id ? res.data : a)));
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(getErrorMessage(err, 'Could not change status'));
      },
    });
  }

  protected confirmDelete(accessory: ProductAccessory): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete accessory?',
          message: `${accessory.name} will be permanently deleted.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '440px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.busyId.set(accessory.id);
        this.accessoryService.remove(accessory.id).subscribe({
          next: (res) => {
            this.busyId.set(null);
            this.toast.success(res.message);
            this.load();
          },
          error: (err) => {
            this.busyId.set(null);
            this.toast.error(getErrorMessage(err, 'Could not delete the accessory'));
          },
        });
      });
  }
}
