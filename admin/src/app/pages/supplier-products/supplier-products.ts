import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Pagination } from '../../core/models/api.model';
import { SupplierProduct } from '../../core/models/supplier-product.model';
import { SupplierProductService } from '../../core/services/supplier-product.service';
import { Supplier } from '../../core/models/supplier.model';
import { SupplierService } from '../../core/services/supplier.service';
import { ToastService } from '../../core/services/toast.service';
import { getErrorMessage } from '../../core/utils/http-error';
import { round2, rupees } from '../../core/utils/pricing';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { SupplierProductForm, SupplierProductFormData } from './supplier-product-form/supplier-product-form';

// Products each supplier sells to Trakway: name, purchase price (before GST), HSN and GST %.
// ?supplier_id= opens the page filtered to one supplier (Suppliers page → "Products").
@Component({
  selector: 'app-supplier-products',
  imports: [FormsModule],
  templateUrl: './supplier-products.html',
})
export class SupplierProducts implements OnInit {
  private readonly supplierProductService = inject(SupplierProductService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supplierService = inject(SupplierService);
  private readonly search$ = new Subject<string>();

  private readonly limit = 20;

  protected readonly rupees = rupees;

  // Every supplier (active and inactive) for the filter; the form only offers active ones.
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly products = signal<SupplierProduct[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  protected search = '';
  protected supplierId: number | '' = '';
  protected status: '' | 'active' | 'inactive' = '';
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
    this.supplierService.list({ limit: 100 }).subscribe({ next: (res) => this.suppliers.set(res.data) });
    this.load();
  }

  protected get hasFilters(): boolean {
    return !!(this.search.trim() || this.status || this.supplierId);
  }

  protected withGst(a: SupplierProduct): number {
    return round2(a.price * (1 + a.gst_rate / 100));
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.supplierProductService
      .list({
        page: this.page,
        limit: this.limit,
        supplier_id: this.supplierId || undefined,
        search: this.search.trim() || undefined,
        status: this.status || undefined,
      })
      .subscribe({
        next: (res) => {
          this.products.set(res.data);
          this.pagination.set(res.pagination);
          this.loading.set(false);
          if (!res.data.length && this.page > 1) {
            this.page--;
            this.load();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load supplier products'));
        },
      });
  }

  protected onSearch(value: string): void {
    this.search$.next(value);
  }

  protected onFilterChange(): void {
    this.page = 1;
    // Keep the supplier filter in the URL so the page can be bookmarked / refreshed.
    this.router.navigate([], { queryParams: { supplier_id: this.supplierId || null }, replaceUrl: true });
    this.load();
  }

  protected clearFilters(): void {
    this.search = '';
    this.status = '';
    this.supplierId = '';
    this.onFilterChange();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  // product null = add.
  protected openForm(product: SupplierProduct | null = null): void {
    this.dialog
      .open<SupplierProductForm, SupplierProductFormData, SupplierProduct>(SupplierProductForm, {
        data: {
          product,
          suppliers: this.suppliers().filter((s) => s.is_active),
          supplierId: this.supplierId || null,
        },
        width: '620px',
        autoFocus: '#product-name',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.toast.success(product ? 'Supplier product updated' : `${saved.name} added`);
        this.load();
      });
  }

  protected toggleStatus(product: SupplierProduct): void {
    this.busyId.set(product.id);
    this.supplierProductService.setStatus(product.id, !product.is_active).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.toast.success(res.message);
        this.products.update((list) => list.map((a) => (a.id === product.id ? res.data : a)));
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(getErrorMessage(err, 'Could not change status'));
      },
    });
  }

  protected confirmDelete(product: SupplierProduct): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete supplier product?',
          message: `${product.name} (${product.supplier_name}) will be permanently deleted.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '440px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.busyId.set(product.id);
        this.supplierProductService.remove(product.id).subscribe({
          next: (res) => {
            this.busyId.set(null);
            this.toast.success(res.message);
            this.load();
          },
          error: (err) => {
            this.busyId.set(null);
            this.toast.error(getErrorMessage(err, 'Could not delete the product'));
          },
        });
      });
  }
}
