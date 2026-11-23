import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Pagination } from '../../core/models/api.model';
import { Purchase } from '../../core/models/purchase.model';
import { PAYMENT_STATUS_BADGE, PAYMENT_STATUS_LABEL, PaymentStatus } from '../../core/models/vendor-invoice.model';
import { Supplier } from '../../core/models/supplier.model';
import { PurchaseService } from '../../core/services/purchase.service';
import { SupplierService } from '../../core/services/supplier.service';
import { ToastService } from '../../core/services/toast.service';
import { formatIsoDate } from '../../core/utils/date';
import { blobErrorMessage } from '../../core/utils/download';
import { getErrorMessage } from '../../core/utils/http-error';
import { rupees } from '../../core/utils/pricing';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';

// Supplier bills Trakway has entered. ?supplier_id= opens it filtered to one supplier.
@Component({
  selector: 'app-purchases',
  imports: [FormsModule, RouterLink],
  templateUrl: './purchases.html',
})
export class Purchases implements OnInit {
  private readonly purchaseService = inject(PurchaseService);
  private readonly supplierService = inject(SupplierService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly search$ = new Subject<string>();

  private readonly limit = 20;

  protected readonly rupees = rupees;
  protected readonly formatDate = formatIsoDate;
  protected readonly STATUS_LABEL = PAYMENT_STATUS_LABEL;
  protected readonly STATUS_BADGE = PAYMENT_STATUS_BADGE;

  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly purchases = signal<Purchase[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly totalAmount = signal(0);
  protected readonly totalPaid = signal(0);
  protected readonly totalBalance = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  protected search = '';
  protected supplierId: number | '' = '';
  protected paymentStatus: PaymentStatus | '' = '';
  protected from = '';
  protected to = '';
  protected page = 1;

  constructor() {
    this.search$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed()).subscribe(() => {
      this.page = 1;
      this.load();
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.queryParamMap.get('supplier_id'));
    if (Number.isInteger(id) && id > 0) this.supplierId = id;
    const status = this.route.snapshot.queryParamMap.get('payment_status');
    if (status === 'unpaid' || status === 'partial' || status === 'paid') this.paymentStatus = status;
    this.supplierService.list({ limit: 100 }).subscribe({ next: (res) => this.suppliers.set(res.data) });
    this.load();
  }

  protected get hasFilters(): boolean {
    return !!(this.search.trim() || this.supplierId || this.paymentStatus || this.from || this.to);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.purchaseService
      .list({
        page: this.page,
        limit: this.limit,
        search: this.search.trim() || undefined,
        supplier_id: this.supplierId || undefined,
        payment_status: this.paymentStatus || undefined,
        from: this.from || undefined,
        to: this.to || undefined,
      })
      .subscribe({
        next: (res) => {
          this.purchases.set(res.data);
          this.pagination.set(res.pagination);
          this.totalAmount.set(res.summary.total_amount);
          this.totalPaid.set(res.summary.total_paid);
          this.totalBalance.set(res.summary.total_balance);
          this.loading.set(false);
          if (!res.data.length && this.page > 1) {
            this.page--;
            this.load();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load purchases'));
        },
      });
  }

  protected onSearch(value: string): void {
    this.search$.next(value);
  }

  protected onFilterChange(): void {
    this.page = 1;
    this.router.navigate([], { queryParams: { supplier_id: this.supplierId || null, payment_status: this.paymentStatus || null }, replaceUrl: true });
    this.load();
  }

  protected clearFilters(): void {
    this.search = '';
    this.supplierId = '';
    this.paymentStatus = '';
    this.from = '';
    this.to = '';
    this.onFilterChange();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  // Opens the private bill in a new tab (fetched with the admin token).
  protected viewBill(purchase: Purchase): void {
    const tab = window.open('', '_blank');
    this.purchaseService.bill(purchase.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (tab) tab.location.href = url;
        else window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: async (err) => {
        tab?.close();
        this.toast.error(await blobErrorMessage(err, 'Could not open the bill'));
      },
    });
  }

  protected confirmDelete(purchase: Purchase): void {
    if (purchase.amount_paid > 0) {
      this.toast.error(`${purchase.purchase_no} has payments. Delete them on the purchase page first.`);
      return;
    }
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete purchase?',
          message: `${purchase.purchase_no} (bill ${purchase.bill_no} from ${purchase.supplier_name}) and its uploaded bill will be permanently deleted.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '460px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.busyId.set(purchase.id);
        this.purchaseService.remove(purchase.id).subscribe({
          next: (res) => {
            this.busyId.set(null);
            this.toast.success(res.message);
            this.load();
          },
          error: (err) => {
            this.busyId.set(null);
            this.toast.error(getErrorMessage(err, 'Could not delete the purchase'));
          },
        });
      });
  }
}
