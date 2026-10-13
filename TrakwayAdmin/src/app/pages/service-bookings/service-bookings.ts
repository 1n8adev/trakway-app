import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Pagination } from '../../core/models/api.model';
import { BookingStatus, BookingSummary, ServiceBooking } from '../../core/models/service-booking.model';
import { ServiceBookingService } from '../../core/services/service-booking.service';
import { TechnicianService } from '../../core/services/technician.service';
import { assetUrl } from '../../core/utils/asset-url';
import { ToastService } from '../../core/services/toast.service';
import { formatIsoDate, todayIso } from '../../core/utils/date';
import { getErrorMessage } from '../../core/utils/http-error';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { BookingDetail, BookingDetailData } from './booking-detail/booking-detail';
import { STATUS_BADGE } from './booking-status';

type Tab = '' | BookingStatus;

// "Book a GPS Service" requests from the website: Open -> Assigned (to a technician) -> Completed.
@Component({
  selector: 'app-service-bookings',
  imports: [FormsModule, MatMenuModule, DatePipe],
  templateUrl: './service-bookings.html',
})
export class ServiceBookings implements OnInit {
  private readonly bookingService = inject(ServiceBookingService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly limit = 20;

  protected readonly STATUS_BADGE = STATUS_BADGE;
  protected readonly assetUrl = assetUrl;
  protected readonly formatIsoDate = formatIsoDate;
  protected readonly today = todayIso();

  protected readonly tabs: { value: Tab; label: string; key: keyof BookingSummary }[] = [
    { value: 'open', label: 'Open', key: 'open' },
    { value: 'assigned', label: 'Assigned', key: 'assigned' },
    { value: 'completed', label: 'Completed', key: 'completed' },
    { value: '', label: 'All', key: 'all' },
  ];

  protected readonly options = toSignal(this.bookingService.options(), { initialValue: null });
  // All technicians (incl. inactive) for the filter.
  protected readonly technicians = toSignal(
    inject(TechnicianService)
      .list({ limit: 100 })
      .pipe(
        map((res) => res.data.map((t) => ({ id: t.id, name: t.name, is_active: t.is_active }))),
        catchError(() => of([])),
      ),
    { initialValue: [] },
  );
  protected readonly bookings = signal<ServiceBooking[]>([]);
  protected readonly summary = signal<BookingSummary | null>(null);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  // Open first: those are the ones waiting for action.
  protected status: Tab = 'open';
  protected search = '';
  protected service = '';
  protected vehicleType = '';
  protected technicianId: number | null = null;
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
    // /service-bookings?technician_id=3 (from the Technicians page) shows all of that technician's bookings.
    const tid = Number(this.route.snapshot.queryParamMap.get('technician_id'));
    if (Number.isInteger(tid) && tid > 0) {
      this.technicianId = tid;
      this.status = '';
    }
    this.load();
  }

  protected get hasFilters(): boolean {
    return !!(this.search.trim() || this.service || this.vehicleType || this.technicianId || this.from || this.to);
  }

  // Reloads the list and the tab counts.
  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadSummary();
    this.bookingService
      .list({
        page: this.page,
        limit: this.limit,
        status: this.status || undefined,
        search: this.search.trim() || undefined,
        service: this.service || undefined,
        vehicle_type: this.vehicleType || undefined,
        technician_id: this.technicianId ?? undefined,
        from: this.from || undefined,
        to: this.to || undefined,
      })
      .subscribe({
        next: (res) => {
          this.bookings.set(res.data);
          this.pagination.set(res.pagination);
          this.loading.set(false);
          if (!res.data.length && this.page > 1) {
            this.page--;
            this.load();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load bookings'));
        },
      });
  }

  private loadSummary(): void {
    this.bookingService.summary().subscribe({ next: (s) => this.summary.set(s), error: () => {} });
  }

  protected selectTab(tab: Tab): void {
    if (this.status === tab) return;
    this.status = tab;
    this.page = 1;
    this.load();
  }

  protected onSearch(value: string): void {
    this.search$.next(value);
  }

  protected onFilterChange(): void {
    this.page = 1;
    this.syncTechnicianParam();
    this.load();
  }

  protected clearFilters(): void {
    this.search = '';
    this.service = '';
    this.vehicleType = '';
    this.technicianId = null;
    this.from = '';
    this.to = '';
    this.page = 1;
    this.syncTechnicianParam();
    this.load();
  }

  // Keeps ?technician_id in the URL so the filtered view can be bookmarked / reloaded.
  private syncTechnicianParam(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { technician_id: this.technicianId ?? null },
      replaceUrl: true,
    });
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  protected openDetail(booking: ServiceBooking, status?: BookingStatus): void {
    this.dialog
      .open<BookingDetail, BookingDetailData, ServiceBooking>(BookingDetail, {
        data: { booking, status },
        width: '720px',
        autoFocus: status === 'assigned' ? '#booking-assigned-to' : false,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        const statusChanged = saved.status !== booking.status;
        const technicianChanged = saved.technician_id !== booking.technician_id;
        this.toast.success(
          saved.technician && saved.status === 'assigned' && (statusChanged || technicianChanged)
            ? `Assigned to ${saved.technician.name}`
            : statusChanged
              ? `Booking marked as ${saved.status_label}`
              : 'Booking updated',
        );
        // A new technician also changes the technician filter results, so reload then too.
        this.applySaved(saved, statusChanged || technicianChanged);
      });
  }

  // Quick status change from the row menu. Assigning needs a technician, so it goes through the dialog.
  protected setStatus(booking: ServiceBooking, status: BookingStatus): void {
    if (status === 'assigned' && !booking.technician_id) {
      this.openDetail(booking, 'assigned');
      return;
    }
    this.busyId.set(booking.id);
    this.bookingService.setStatus(booking.id, status).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.toast.success(res.message);
        this.applySaved(res.data, true);
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(getErrorMessage(err, 'Could not change status'));
      },
    });
  }

  protected confirmDelete(booking: ServiceBooking): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete booking?',
          message: `${booking.booking_no} from ${booking.name} will be permanently deleted. Use this for spam or duplicate requests.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '440px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.busyId.set(booking.id);
        this.bookingService.remove(booking.id).subscribe({
          next: () => {
            this.busyId.set(null);
            this.toast.success('Booking deleted');
            this.load();
          },
          error: (err) => {
            this.busyId.set(null);
            this.toast.error(getErrorMessage(err, 'Could not delete booking'));
          },
        });
      });
  }

  // Updates the row in place, or reloads when the status changed (the row may leave this tab, counts change).
  private applySaved(saved: ServiceBooking, statusChanged: boolean): void {
    if (statusChanged) this.load();
    else this.bookings.update((list) => list.map((b) => (b.id === saved.id ? saved : b)));
  }
}
