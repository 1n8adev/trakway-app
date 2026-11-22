import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Pagination } from '../../core/models/api.model';
import { Supplier } from '../../core/models/supplier.model';
import { ServiceBookingService } from '../../core/services/service-booking.service';
import { ToastService } from '../../core/services/toast.service';
import { SupplierService } from '../../core/services/supplier.service';
import { getErrorMessage } from '../../core/utils/http-error';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { SupplierForm, SupplierFormData } from './supplier-form/supplier-form';

// Businesses Trakway buys products from.
@Component({
  selector: 'app-suppliers',
  imports: [FormsModule, MatMenuModule, RouterLink],
  templateUrl: './suppliers.html',
})
export class Suppliers implements OnInit {
  private readonly supplierService = inject(SupplierService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();

  private readonly limit = 20;

  protected readonly states = toSignal(inject(ServiceBookingService).options().pipe(map((o) => o.states)), {
    initialValue: [] as string[],
  });

  protected readonly suppliers = signal<Supplier[]>([]);
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
    this.supplierService
      .list({
        page: this.page,
        limit: this.limit,
        search: this.search.trim() || undefined,
        state: this.state || undefined,
        status: this.status || undefined,
      })
      .subscribe({
        next: (res) => {
          this.suppliers.set(res.data);
          this.pagination.set(res.pagination);
          this.loading.set(false);
          if (!res.data.length && this.page > 1) {
            this.page--;
            this.load();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load suppliers'));
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

  // supplier null = add.
  protected openForm(supplier: Supplier | null = null): void {
    this.dialog
      .open<SupplierForm, SupplierFormData, Supplier>(SupplierForm, {
        data: { supplier },
        width: '760px',
        autoFocus: '#supplier-name',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.toast.success(supplier ? 'Supplier updated' : 'Supplier added');
        this.load();
      });
  }

  protected toggleStatus(supplier: Supplier): void {
    this.busyId.set(supplier.id);
    this.supplierService.setStatus(supplier.id, !supplier.is_active).subscribe({
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

  protected confirmDelete(supplier: Supplier): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete supplier?',
          message: `${supplier.name} will be permanently deleted.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '460px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.busyId.set(supplier.id);
        this.supplierService.remove(supplier.id).subscribe({
          next: () => {
            this.busyId.set(null);
            this.toast.success('Supplier deleted');
            this.load();
          },
          error: (err) => {
            this.busyId.set(null);
            this.toast.error(getErrorMessage(err, 'Could not delete supplier'));
          },
        });
      });
  }
}
