import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { ORDER_STATUS_LABEL, Order, OrderStatus, OrderStatusPayload } from '../../core/models/order.model';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { CancelOrder, CancelOrderData } from './cancel-order/cancel-order';

const CONFIRM_MESSAGE: Partial<Record<OrderStatus, (o: Order) => string>> = {
  confirmed: (o) => `You've checked stock for ${o.order_no} and will pack it for dispatch.`,
  shipped: (o) => `${o.order_no} has been handed to the courier for ${o.ship_city}, ${o.ship_pincode}.`,
  delivered: (o) => `${o.order_no} reached the customer and the cash was collected. Payment will be marked paid. This can't be undone.`,
};

// Asks before moving an order on. Emits the PATCH body, or undefined when the admin backs out.
export function askStatusChange(dialog: MatDialog, order: Order, status: OrderStatus): Observable<OrderStatusPayload | undefined> {
  if (status === 'cancelled') {
    return dialog
      .open<CancelOrder, CancelOrderData, { reason: string | null }>(CancelOrder, {
        data: { order },
        width: '480px',
        autoFocus: '#cancel-reason',
      })
      .afterClosed()
      .pipe(map((res) => (res ? { status, cancel_reason: res.reason } : undefined)));
  }
  return dialog
    .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: `Mark as ${ORDER_STATUS_LABEL[status].toLowerCase()}?`,
        message: CONFIRM_MESSAGE[status]?.(order) ?? `${order.order_no} will be marked ${status}.`,
        confirmText: `Mark ${ORDER_STATUS_LABEL[status]}`,
      },
      width: '460px',
      autoFocus: false,
    })
    .afterClosed()
    .pipe(map((ok) => (ok ? { status } : undefined)));
}
