import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Pagination } from '../../core/models/api.model';
import {
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABEL,
  PaymentStatus,
  VendorInvoiceFilters,
  VendorInvoiceListItem,
  VendorInvoiceStatus,
  VendorInvoiceSummary,
} from '../../core/models/vendor-invoice.model';
import { ToastService } from '../../core/services/toast.service';
import { VendorInvoiceService } from '../../core/services/vendor-invoice.service';
import { formatIsoDate, todayIso } from '../../core/utils/date';
import { blobErrorMessage, fileNameFrom, saveBlob } from '../../core/utils/download';
import { getErrorMessage } from '../../core/utils/http-error';
import { rupees } from '../../core/utils/pricing';

// GST invoices raised to vendors, with billed / received / outstanding totals for the current filters.
@Component({
  selector: 'app-vendor-invoices',
  imports: [FormsModule, RouterLink],
  templateUrl: './vendor-invoices.html',
})
export class VendorInvoices implements OnInit {
  private readonly invoiceService = inject(VendorInvoiceService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly search$ = new Subject<string>();

  private readonly limit = 20;

  protected readonly rupees = rupees;
  protected readonly formatIsoDate = formatIsoDate;
  protected readonly PAYMENT_STATUS_LABEL = PAYMENT_STATUS_LABEL;
  protected readonly PAYMENT_STATUS_BADGE = PAYMENT_STATUS_BADGE;
  protected readonly today = todayIso();

  // Active vendors for the filter. Inactive ones drop out of options, but ?vendor_id still filters by them.
  protected readonly vendors = toSignal(
    this.invoiceService.options().pipe(map((o) => o.vendors.map((v): { id: number; name: string } => ({ id: v.id, name: v.name })))),
    { initialValue: [] as { id: number; name: string }[] },
  );

  protected get vendorNotListed(): boolean {
    return !!this.vendorId && !this.vendors().some((v) => String(v.id) === this.vendorId);
  }

  protected readonly invoices = signal<VendorInvoiceListItem[]>([]);
  protected readonly summary = signal<VendorInvoiceSummary | null>(null);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pdfBusyId = signal<number | null>(null);

  protected search = '';
  protected vendorId = '';
  protected paymentStatus: '' | PaymentStatus = '';
  protected status: '' | VendorInvoiceStatus = '';
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
    // From the vendors page: /vendor-invoices?vendor_id=3
    this.vendorId = this.route.snapshot.queryParamMap.get('vendor_id') ?? '';
    this.load();
  }

  protected get hasFilters(): boolean {
    return !!(this.search.trim() || this.vendorId || this.paymentStatus || this.status || this.from || this.to);
  }

  private filters(): VendorInvoiceFilters {
    return {
      search: this.search.trim() || undefined,
      vendor_id: this.vendorId ? Number(this.vendorId) : undefined,
      payment_status: this.paymentStatus || undefined,
      status: this.status || undefined,
      from: this.from || undefined,
      to: this.to || undefined,
    };
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const filters = this.filters();
    this.invoiceService.list({ ...filters, page: this.page, limit: this.limit }).subscribe({
      next: (res) => {
        this.invoices.set(res.data);
        this.pagination.set(res.pagination);
        this.loading.set(false);
        if (!res.data.length && this.page > 1) {
          this.page--;
          this.load();
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(getErrorMessage(err, 'Could not load invoices'));
      },
    });
    this.invoiceService.summary(filters).subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.summary.set(null),
    });
  }

  protected onSearch(value: string): void {
    this.search$.next(value);
  }

  protected onFilterChange(): void {
    this.page = 1;
    // Keep ?vendor_id in the URL so the filter survives a refresh / back.
    this.router.navigate([], { queryParams: { vendor_id: this.vendorId || null }, replaceUrl: true });
    this.load();
  }

  protected clearFilters(): void {
    this.search = '';
    this.vendorId = '';
    this.paymentStatus = '';
    this.status = '';
    this.from = '';
    this.to = '';
    this.onFilterChange();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  protected isOverdue(inv: VendorInvoiceListItem): boolean {
    return inv.status === 'issued' && inv.balance > 0 && !!inv.due_date && inv.due_date < this.today;
  }

  protected downloadPdf(inv: VendorInvoiceListItem): void {
    if (this.pdfBusyId()) return;
    this.pdfBusyId.set(inv.id);
    this.invoiceService.pdf(inv.id).subscribe({
      next: (res) => {
        this.pdfBusyId.set(null);
        if (res.body) saveBlob(res.body, fileNameFrom(res.headers.get('Content-Disposition'), `Invoice-${inv.id}.pdf`));
      },
      error: async (err) => {
        this.pdfBusyId.set(null);
        this.toast.error(await blobErrorMessage(err, 'Could not download the invoice'));
      },
    });
  }
}
