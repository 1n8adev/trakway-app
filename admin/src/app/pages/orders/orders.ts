import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Pagination } from '../../core/models/api.model';
import {
  ORDER_ACTION_LABEL,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  Order,
  OrderStatus,
  OrderSummary,
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABEL,
  PaymentStatus,
} from '../../core/models/order.model';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { todayIso } from '../../core/utils/date';
import { getErrorMessage } from '../../core/utils/http-error';
import { rupees } from '../../core/utils/pricing';
import { askStatusChange } from './order-actions';

type Tab = 'all' | OrderStatus;

const TABS: Tab[] = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'all'];
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'cancelled'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Website orders (Cash on Delivery): Placed -> Confirmed -> Shipped -> Delivered, or Cancelled.
// Filters live in the URL so coming back from an order keeps the same view.
@Component({
  selector: 'app-orders',
  imports: [FormsModule, MatMenuModule, DatePipe, RouterLink],
  templateUrl: './orders.html',
})
export class Orders implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly search$ = new Subject<string>();

  private readonly limit = 20;

  protected readonly STATUS_LABEL = ORDER_STATUS_LABEL;
  protected readonly STATUS_BADGE = ORDER_STATUS_BADGE;
  protected readonly PAYMENT_LABEL = PAYMENT_STATUS_LABEL;
  protected readonly PAYMENT_BADGE = PAYMENT_STATUS_BADGE;
  protected readonly ACTION_LABEL = ORDER_ACTION_LABEL;
  protected readonly paymentStatuses = PAYMENT_STATUSES;
  protected readonly rupees = rupees;
  protected readonly today = todayIso();
  protected readonly tabs = TABS.map((value) => ({ value, label: value === 'all' ? 'All' : ORDER_STATUS_LABEL[value] }));

  protected readonly orders = signal<Order[]>([]);
  protected readonly summary = signal<OrderSummary | null>(null);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);
  // Name for the "Customer" chip when filtered by ?user_id.
  protected readonly customerName = signal<string | null>(null);

  // Placed first: those are waiting for the admin.
  protected status: Tab = 'placed';
  protected search = '';
  protected paymentStatus: '' | PaymentStatus = '';
  protected from = '';
  protected to = '';
  protected userId: number | null = null;
  protected page = 1;

  constructor() {
    this.search$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed()).subscribe(() => {
      this.page = 1;
      this.reload();
    });
  }

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const status = q.get('status') as Tab | null;
    const payment = q.get('payment_status') as PaymentStatus | null;
    const userId = Number(q.get('user_id'));
    if (status && TABS.includes(status)) this.status = status;
    if (payment && PAYMENT_STATUSES.includes(payment)) this.paymentStatus = payment;
    if (DATE_REGEX.test(q.get('from') ?? '')) this.from = q.get('from')!;
    if (DATE_REGEX.test(q.get('to') ?? '')) this.to = q.get('to')!;
    this.search = q.get('search') ?? '';
    this.page = Math.max(1, Number(q.get('page')) || 1);
    // /orders?user_id=5 (from Website Users) shows all of that customer's orders.
    if (Number.isInteger(userId) && userId > 0) {
      this.userId = userId;
      if (!status) this.status = 'all';
    }
    this.load();
  }

  protected get hasFilters(): boolean {
    return !!(this.search.trim() || this.paymentStatus || this.from || this.to || this.userId);
  }

  // Reloads the list and the tab counts.
  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadSummary();
    this.orderService
      .list({
        page: this.page,
        limit: this.limit,
        status: this.status === 'all' ? undefined : this.status,
        payment_status: this.paymentStatus || undefined,
        search: this.search.trim() || undefined,
        from: this.from || undefined,
        to: this.to || undefined,
        user_id: this.userId ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.orders.set(res.data);
          this.pagination.set(res.pagination);
          this.loading.set(false);
          if (this.userId && res.data.length) this.customerName.set(res.data[0].customer.name);
          if (!res.data.length && this.page > 1) {
            this.page--;
            this.reload();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load orders'));
        },
      });
  }

  private loadSummary(): void {
    this.orderService.summary().subscribe({ next: (s) => this.summary.set(s), error: () => {} });
  }

  // Load after putting the filters in the URL.
  private reload(): void {
    this.syncUrl();
    this.load();
  }

  private syncUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: this.status === 'placed' && !this.userId ? null : this.status,
        payment_status: this.paymentStatus || null,
        search: this.search.trim() || null,
        from: this.from || null,
        to: this.to || null,
        user_id: this.userId,
        page: this.page > 1 ? this.page : null,
      },
      replaceUrl: true,
    });
  }

  protected selectTab(tab: Tab): void {
    if (this.status === tab) return;
    this.status = tab;
    this.page = 1;
    this.reload();
  }

  protected onSearch(value: string): void {
    this.search$.next(value);
  }

  protected onFilterChange(): void {
    this.page = 1;
    this.reload();
  }

  protected clearCustomer(): void {
    this.userId = null;
    this.customerName.set(null);
    this.onFilterChange();
  }

  protected clearFilters(): void {
    this.search = '';
    this.paymentStatus = '';
    this.from = '';
    this.to = '';
    this.userId = null;
    this.customerName.set(null);
    this.page = 1;
    this.reload();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.reload();
  }

  protected changeStatus(order: Order, status: OrderStatus): void {
    askStatusChange(this.dialog, order, status).subscribe((payload) => {
      if (!payload) return;
      this.busyId.set(order.id);
      this.orderService.setStatus(order.id, payload).subscribe({
        next: (res) => {
          this.busyId.set(null);
          this.toast.success(res.message);
          // The order leaves a single-status tab; on All it just updates in place.
          if (this.status === 'all') {
            const { items: _, ...updated } = res.data;
            this.orders.update((list) => list.map((o) => (o.id === order.id ? { ...o, ...updated } : o)));
            this.loadSummary();
          } else {
            this.load();
          }
        },
        error: (err) => {
          this.busyId.set(null);
          this.toast.error(getErrorMessage(err, 'Could not update the order'));
          // 409: someone else moved it; 400: no longer allowed. Show the current state.
          if (err instanceof HttpErrorResponse && (err.status === 409 || err.status === 400)) this.load();
        },
      });
    });
  }
}
