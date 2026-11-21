import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Pagination } from '../../core/models/api.model';
import { Vendor } from '../../core/models/vendor.model';
import { ServiceBookingService } from '../../core/services/service-booking.service';
import { ToastService } from '../../core/services/toast.service';
import { VendorService } from '../../core/services/vendor.service';
import { getErrorMessage } from '../../core/utils/http-error';
import { rupees } from '../../core/utils/pricing';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { VendorForm, VendorFormData } from './vendor-form/vendor-form';

// Businesses we raise GST invoices to.
@Component({
  selector: 'app-vendors',
  imports: [FormsModule, MatMenuModule, RouterLink],
  templateUrl: './vendors.html',
})
export class Vendors implements OnInit {
  private readonly vendorService = inject(VendorService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();

  private readonly limit = 20;

  protected readonly rupees = rupees;
  protected readonly states = toSignal(inject(ServiceBookingService).options().pipe(map((o) => o.states)), {
    initialValue: [] as string[],
  });

  protected readonly vendors = signal<Vendor[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  protected search = '';
  protected state = '';
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
    return !!(this.search.trim() || this.state || this.status);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.vendorService
      .list({
        page: this.page,
        limit: this.limit,
        search: this.search.trim() || undefined,
        state: this.state || undefined,
        status: this.status || undefined,
      })
      .subscribe({
        next: (res) => {
          this.vendors.set(res.data);
          this.pagination.set(res.pagination);
          this.loading.set(false);
          if (!res.data.length && this.page > 1) {
            this.page--;
            this.load();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load vendors'));
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
    this.state = '';
    this.status = '';
    this.page = 1;
    this.load();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  // vendor null = add.
  protected openForm(vendor: Vendor | null = null): void {
    this.dialog
      .open<VendorForm, VendorFormData, Vendor>(VendorForm, {
        data: { vendor },
        width: '760px',
        autoFocus: '#vendor-name',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.toast.success(vendor ? 'Vendor updated' : 'Vendor added');
        // The list row carries invoice totals that GET /:id doesn't, so reload rather than patch.
        this.load();
      });
  }

  protected toggleStatus(vendor: Vendor): void {
    this.busyId.set(vendor.id);
    this.vendorService.setStatus(vendor.id, !vendor.is_active).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.toast.success(res.message);
        this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(getErrorMessage(err, 'Could not change status'));
      },
    });
  }

  protected confirmDelete(vendor: Vendor): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete vendor?',
          message: `${vendor.name} will be permanently deleted. Vendors with invoices can't be deleted — deactivate them instead.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '460px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.busyId.set(vendor.id);
        this.vendorService.remove(vendor.id).subscribe({
          next: () => {
            this.busyId.set(null);
            this.toast.success('Vendor deleted');
            this.load();
          },
          error: (err) => {
            this.busyId.set(null);
            this.toast.error(getErrorMessage(err, 'Could not delete vendor'));
          },
        });
      });
  }
}
