import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { map } from 'rxjs';
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  OrderStatus,
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABEL,
} from '../../../core/models/order.model';
import { UserAddress, UserOrder, WebsiteUserDetail } from '../../../core/models/user.model';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { assetUrl } from '../../../core/utils/asset-url';
import { getErrorMessage } from '../../../core/utils/http-error';
import { rupees } from '../../../core/utils/pricing';
import { confirmStatusChange } from '../confirm-block';

type OrderTab = 'all' | 'active' | 'delivered' | 'cancelled';

const ACTIVE: OrderStatus[] = ['placed', 'confirmed', 'shipped'];

// One website customer: profile, order stats, saved addresses, cart, and every order with its items.
@Component({
  selector: 'app-user-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './user-detail.html',
})
export class UserDetail {
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // Route param (withComponentInputBinding).
  readonly id = input.required<string>();

  protected readonly STATUS_LABEL = ORDER_STATUS_LABEL;
  protected readonly STATUS_BADGE = ORDER_STATUS_BADGE;
  protected readonly PAYMENT_LABEL = PAYMENT_STATUS_LABEL;
  protected readonly PAYMENT_BADGE = PAYMENT_STATUS_BADGE;
  protected readonly assetUrl = assetUrl;
  protected readonly rupees = rupees;

  protected readonly user = signal<WebsiteUserDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly orderTab = signal<OrderTab>('all');
  // Orders opened to show items and addresses.
  protected readonly expanded = signal<ReadonlySet<number>>(new Set());

  protected readonly orderTabs = computed(() => {
    const s = this.user()?.order_stats;
    return [
      { value: 'all' as const, label: 'All', count: s?.orders_count ?? 0 },
      { value: 'active' as const, label: 'In progress', count: s?.active_orders ?? 0 },
      { value: 'delivered' as const, label: 'Delivered', count: s?.delivered ?? 0 },
      { value: 'cancelled' as const, label: 'Cancelled', count: s?.cancelled ?? 0 },
    ];
  });

  protected readonly orders = computed(() => {
    const all = this.user()?.orders ?? [];
    const tab = this.orderTab();
    if (tab === 'all') return all;
    if (tab === 'active') return all.filter((o) => ACTIVE.includes(o.status));
    return all.filter((o) => o.status === tab);
  });

  protected readonly initials = computed(() =>
    (this.user()?.name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
  );

  constructor() {
    toObservable(this.id)
      .pipe(map(Number), takeUntilDestroyed())
      .subscribe((id) => this.fetch(id));
  }

  protected fetch(id = Number(this.id())): void {
    if (!Number.isInteger(id) || id <= 0) {
      this.loading.set(false);
      this.error.set('Customer not found');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.userService.getById(id).subscribe({
      next: (user) => {
        this.setUser(user);
        // Open the latest order so its items show straight away.
        if (user.orders.length) this.expanded.set(new Set([user.orders[0].id]));
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(getErrorMessage(err, 'Could not load the customer'));
      },
    });
  }

  // Back to the list with the filters it had, when we came from there.
  protected back(): void {
    if ((history.state as { fromList?: boolean } | null)?.fromList) this.location.back();
    else this.router.navigate(['/users']);
  }

  protected toggleStatus(): void {
    const user = this.user();
    if (!user) return;
    confirmStatusChange(this.dialog, user).subscribe((ok) => {
      if (!ok) return;
      this.saving.set(true);
      this.userService.setStatus(user.id, !user.is_active).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.setUser(res.data);
          this.toast.success(res.message);
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(getErrorMessage(err, 'Could not change status'));
        },
      });
    });
  }

  protected toggleOrder(id: number): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected shipAddress(o: UserOrder): string {
    return [o.ship_address_line1, o.ship_address_line2, o.ship_landmark, `${o.ship_city}, ${o.ship_state} ${o.ship_pincode}`]
      .filter(Boolean)
      .join('\n');
  }

  protected billAddress(o: UserOrder): string {
    return [o.bill_address_line1, o.bill_address_line2, o.bill_landmark, `${o.bill_city}, ${o.bill_state} ${o.bill_pincode}`]
      .filter(Boolean)
      .join('\n');
  }

  protected savedAddress(a: UserAddress): string {
    return [a.address_line1, a.address_line2, a.landmark, `${a.city}, ${a.state} ${a.pincode}`].filter(Boolean).join('\n');
  }

  // Up to 4 thumbnails on a collapsed order.
  protected thumbs(o: UserOrder) {
    return o.items.slice(0, 4);
  }

  private setUser(user: WebsiteUserDetail): void {
    this.user.set(user);
    this.loading.set(false);
  }
}
