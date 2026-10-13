import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Pagination } from '../../core/models/api.model';
import { COUPON_STATE_BADGE, COUPON_STATE_LABEL, Coupon } from '../../core/models/coupon.model';
import { CouponService } from '../../core/services/coupon.service';
import { ToastService } from '../../core/services/toast.service';
import { getErrorMessage } from '../../core/utils/http-error';
import { rupees } from '../../core/utils/pricing';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { CouponForm, CouponFormData } from './coupon-form/coupon-form';

// Discount codes customers enter at checkout.
@Component({
  selector: 'app-coupons',
  imports: [FormsModule, MatMenuModule, DatePipe],
  templateUrl: './coupons.html',
})
export class Coupons implements OnInit {
  private readonly couponService = inject(CouponService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();

  private readonly limit = 20;

  protected readonly STATE_LABEL = COUPON_STATE_LABEL;
  protected readonly STATE_BADGE = COUPON_STATE_BADGE;
  protected readonly rupees = rupees;

  protected readonly coupons = signal<Coupon[]>([]);
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

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.couponService
      .list({
        page: this.page,
        limit: this.limit,
        search: this.search.trim() || undefined,
        status: this.status || undefined,
      })
      .subscribe({
        next: (res) => {
          this.coupons.set(res.data);
          this.pagination.set(res.pagination);
          this.loading.set(false);
          if (!res.data.length && this.page > 1) {
            this.page--;
            this.load();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load coupons'));
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
    this.page = 1;
    this.load();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  // Share of the total limit used, for the usage bar.
  protected usagePercent(c: Coupon): number {
    return c.usage_limit ? Math.min(100, Math.round((c.used_count / c.usage_limit) * 100)) : 0;
  }

  // coupon null = add.
  protected openForm(coupon: Coupon | null = null): void {
    this.dialog
      .open<CouponForm, CouponFormData, Coupon>(CouponForm, {
        data: { coupon },
        width: '720px',
        autoFocus: coupon ? false : '#coupon-code',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.toast.success(coupon ? 'Coupon updated' : 'Coupon created');
        if (coupon && this.matchesFilter(saved)) {
          this.coupons.update((list) => list.map((c) => (c.id === saved.id ? saved : c)));
        } else {
          this.load();
        }
      });
  }

  protected async copyCode(coupon: Coupon): Promise<void> {
    try {
      await navigator.clipboard.writeText(coupon.code);
      this.toast.success(`Copied ${coupon.code}`);
    } catch {
      this.toast.error('Could not copy the code');
    }
  }

  protected toggleStatus(coupon: Coupon): void {
    this.busyId.set(coupon.id);
    this.couponService.setStatus(coupon.id, !coupon.is_active).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.toast.success(res.message);
        if (this.matchesFilter(res.data)) this.coupons.update((list) => list.map((c) => (c.id === coupon.id ? res.data : c)));
        else this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(getErrorMessage(err, 'Could not change status'));
      },
    });
  }

  protected confirmDelete(coupon: Coupon): void {
    // Used coupons are kept for order history; the API would refuse with 409.
    if (coupon.used_count) {
      this.offerDeactivate(coupon);
      return;
    }
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete coupon?',
          message: `${coupon.code} will be permanently deleted. Customers won't be able to use it.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '460px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.busyId.set(coupon.id);
        this.couponService.remove(coupon.id).subscribe({
          next: () => {
            this.busyId.set(null);
            this.toast.success('Coupon deleted');
            this.load();
          },
          error: (err) => {
            this.busyId.set(null);
            // Used in a cancelled order (not counted in used_count) — still can't be deleted.
            if (err instanceof HttpErrorResponse && err.status === 409) this.offerDeactivate(coupon);
            else this.toast.error(getErrorMessage(err, 'Could not delete coupon'));
          },
        });
      });
  }

  private offerDeactivate(coupon: Coupon): void {
    if (!coupon.is_active) {
      this.toast.error(`${coupon.code} has been used in orders, so it's kept for order history. It's already inactive.`);
      return;
    }
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: "Can't delete a used coupon",
          message: `${coupon.code} has been used in orders, so it's kept for order history. Deactivate it so customers can't use it any more?`,
          confirmText: 'Deactivate',
        },
        width: '460px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.toggleStatus(coupon);
      });
  }

  private matchesFilter(c: Coupon): boolean {
    return !this.status || (this.status === 'active') === c.is_active;
  }
}
