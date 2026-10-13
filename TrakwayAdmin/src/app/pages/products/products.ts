import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Pagination } from '../../core/models/api.model';
import { ProductFilters, ProductListItem } from '../../core/models/product.model';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { ToastService } from '../../core/services/toast.service';
import { FlatCategoryOption, flattenCategoryTree } from '../../core/utils/category-tree';
import { getErrorMessage } from '../../core/utils/http-error';
import { assetUrl } from '../../core/utils/asset-url';
import { rupees } from '../../core/utils/pricing';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-products',
  imports: [FormsModule, RouterLink, MatMenuModule],
  templateUrl: './products.html',
})
export class Products implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();

  protected readonly assetUrl = assetUrl;
  protected readonly rupees = rupees;
  protected readonly pageSizes = [10, 20, 50, 100];
  protected readonly skeletonRows = Array.from({ length: 6 });

  protected readonly products = signal<ProductListItem[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly categories = signal<FlatCategoryOption[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  protected search = '';
  protected categoryId: number | null = null;
  protected status: '' | 'active' | 'inactive' = '';
  protected page = 1;
  protected limit = 10;

  protected readonly range = computed(() => {
    const p = this.pagination();
    if (!p || !p.total) return null;
    const from = (p.page - 1) * p.limit + 1;
    return { from, to: Math.min(from + this.products().length - 1, p.total), total: p.total };
  });

  protected readonly pages = computed(() => {
    const p = this.pagination();
    if (!p || p.totalPages <= 1) return [];
    const start = Math.max(1, Math.min(p.page - 2, p.totalPages - 4));
    const end = Math.min(p.totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  constructor() {
    this.search$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed()).subscribe(() => {
      this.page = 1;
      this.load();
    });
  }

  ngOnInit(): void {
    this.load();
    this.categoryService.tree().subscribe({
      next: (tree) => this.categories.set(flattenCategoryTree(tree)),
      error: () => this.categories.set([]),
    });
  }

  protected load(): void {
    const filters: ProductFilters = {
      page: this.page,
      limit: this.limit,
      search: this.search.trim() || undefined,
      category_id: this.categoryId ?? undefined,
      status: this.status || undefined,
    };
    this.loading.set(true);
    this.error.set(null);
    this.productService.list(filters).subscribe({
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
        this.error.set(getErrorMessage(err, 'Could not load products'));
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

  protected goTo(page: number): void {
    const p = this.pagination();
    if (!p || page < 1 || page > p.totalPages || page === p.page) return;
    this.page = page;
    this.load();
  }

  protected indent(depth: number): string {
    return '   '.repeat(depth);
  }

  protected toggleStatus(product: ProductListItem): void {
    this.busyId.set(product.id);
    this.productService.setStatus(product.id, !product.is_active).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.products.update((list) => list.map((p) => (p.id === product.id ? { ...p, is_active: res.data.is_active } : p)));
        this.toast.success(res.message);
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(getErrorMessage(err, 'Could not change status'));
      },
    });
  }

  protected confirmDelete(product: ProductListItem): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete product?',
          message: `"${product.name}" with its images, benefits and combinations will be permanently deleted.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '440px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.delete(product);
      });
  }

  private delete(product: ProductListItem): void {
    this.busyId.set(product.id);
    this.productService.remove(product.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(`"${product.name}" deleted`);
        this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(getErrorMessage(err, 'Could not delete product'));
      },
    });
  }
}
