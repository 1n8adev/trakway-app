import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toObservable, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { map, startWith } from 'rxjs';
import {
  ORDER_ACTION_LABEL,
  ORDER_LIMITS,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  Order,
  OrderStatus,
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABEL,
} from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { assetUrl } from '../../../core/utils/asset-url';
import { getErrorMessage } from '../../../core/utils/http-error';
import { rupees } from '../../../core/utils/pricing';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';
import { askStatusChange } from '../order-actions';

interface TimelineStep {
  label: string;
  at: string | null;
  done: boolean;
  cancelled?: boolean;
}

// One order: items, totals, customer, delivery address, timeline, status buttons and admin notes.
@Component({
  selector: 'app-order-detail',
  imports: [DatePipe, RouterLink, ReactiveFormsModule],
  templateUrl: './order-detail.html',
})
export class OrderDetail {
  private readonly orderService = inject(OrderService);
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
  protected readonly ACTION_LABEL = ORDER_ACTION_LABEL;
  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly fieldState = fieldState;
  protected readonly maxNotes = ORDER_LIMITS.maxAdminNotes;
  protected readonly assetUrl = assetUrl;
  protected readonly rupees = rupees;

  protected readonly order = signal<Order | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly statusBusy = signal<OrderStatus | null>(null);
  protected readonly notesSaving = signal(false);

  protected readonly notes = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(this.maxNotes)] });
  private readonly notesValue = toSignal(this.notes.valueChanges.pipe(startWith(this.notes.value)), { requireSync: true });
  protected readonly notesDirty = computed(() => (this.notesValue().trim() || null) !== (this.order()?.admin_notes ?? null));

  // Forward steps first, Cancel last.
  protected readonly actions = computed(() => {
    const next = this.order()?.next_statuses ?? [];
    return [...next.filter((s) => s !== 'cancelled'), ...next.filter((s) => s === 'cancelled')];
  });

  protected readonly saved = computed(() => {
    const o = this.order();
    return o ? Math.max(0, o.mrp_total - o.subtotal) : 0;
  });

  protected readonly timeline = computed<TimelineStep[]>(() => {
    const o = this.order();
    if (!o) return [];
    const steps: TimelineStep[] = [
      { label: 'Order placed', at: o.created_at, done: true },
      { label: 'Confirmed', at: o.confirmed_at, done: !!o.confirmed_at },
      { label: 'Shipped', at: o.shipped_at, done: !!o.shipped_at },
      { label: 'Delivered', at: o.delivered_at, done: !!o.delivered_at },
    ];
    if (o.status !== 'cancelled') return steps;
    // Show the steps it reached, then the cancellation.
    return [...steps.filter((s) => s.done), { label: 'Cancelled', at: o.cancelled_at, done: true, cancelled: true }];
  });

  protected readonly address = computed(() => {
    const o = this.order();
    if (!o) return '';
    return [o.ship_address_line1, o.ship_address_line2, o.ship_landmark, `${o.ship_city}, ${o.ship_state} ${o.ship_pincode}`]
      .filter(Boolean)
      .join('\n');
  });

  protected readonly billingAddress = computed(() => {
    const o = this.order();
    if (!o) return '';
    return [o.bill_address_line1, o.bill_address_line2, o.bill_landmark, `${o.bill_city}, ${o.bill_state} ${o.bill_pincode}`]
      .filter(Boolean)
      .join('\n');
  });

  constructor() {
    toObservable(this.id)
      .pipe(map(Number), takeUntilDestroyed())
      .subscribe((id) => this.fetch(id));
  }

  protected fetch(id = Number(this.id())): void {
    if (!Number.isInteger(id) || id <= 0) {
      this.loading.set(false);
      this.error.set('Order not found');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.orderService.getById(id).subscribe({
      next: (order) => this.setOrder(order),
      error: (err) => {
        this.loading.set(false);
        this.error.set(getErrorMessage(err, 'Could not load the order'));
      },
    });
  }

  // Back to the list with the filters it had, when we came from there.
  protected back(): void {
    if ((history.state as { fromList?: boolean } | null)?.fromList) this.location.back();
    else this.router.navigate(['/orders']);
  }

  protected changeStatus(status: OrderStatus): void {
    const order = this.order();
    if (!order) return;
    askStatusChange(this.dialog, order, status).subscribe((payload) => {
      if (!payload) return;
      this.statusBusy.set(status);
      this.orderService.setStatus(order.id, payload).subscribe({
        next: (res) => {
          this.statusBusy.set(null);
          this.toast.success(res.message);
          this.setOrder(res.data, true);
        },
        error: (err) => {
          this.statusBusy.set(null);
          this.toast.error(getErrorMessage(err, 'Could not update the order'));
          // 409: another admin changed it; 400: no longer allowed. Show the current state.
          if (err instanceof HttpErrorResponse && (err.status === 409 || err.status === 400)) this.fetch(order.id);
        },
      });
    });
  }

  protected saveNotes(): void {
    const order = this.order();
    if (!order || this.notes.invalid || !this.notesDirty()) return;
    this.notesSaving.set(true);
    this.orderService.updateNotes(order.id, this.notes.value.trim() || null).subscribe({
      next: (res) => {
        this.notesSaving.set(false);
        this.toast.success('Notes saved');
        this.setOrder(res.data);
      },
      error: (err) => {
        this.notesSaving.set(false);
        this.toast.error(getErrorMessage(err, 'Could not save notes'));
      },
    });
  }

  protected resetNotes(): void {
    this.notes.setValue(this.order()?.admin_notes ?? '');
  }

  protected async copyAddress(): Promise<void> {
    const o = this.order();
    if (!o) return;
    try {
      await navigator.clipboard.writeText(`${o.ship_name}\n${this.address()}\nPhone: ${o.ship_phone}`);
      this.toast.success('Address copied');
    } catch {
      this.toast.error('Could not copy the address');
    }
  }

  // Billing details as they'd go on an invoice.
  protected async copyBilling(): Promise<void> {
    const o = this.order();
    if (!o) return;
    const lines = [
      o.bill_company_name,
      o.bill_gstin && `GSTIN: ${o.bill_gstin}`,
      o.bill_name,
      this.billingAddress(),
      `Phone: ${o.bill_phone}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
      this.toast.success('Billing details copied');
    } catch {
      this.toast.error('Could not copy the billing details');
    }
  }

  // keepNotes: a status change shouldn't wipe notes the admin is still typing.
  private setOrder(order: Order, keepNotes = false): void {
    const typing = keepNotes && this.notesDirty();
    this.order.set(order);
    this.loading.set(false);
    if (!typing) this.notes.setValue(order.admin_notes ?? '');
  }
}
