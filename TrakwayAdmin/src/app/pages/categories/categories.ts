import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, catchError, debounceTime, distinctUntilChanged, forkJoin, map, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Category, CategoryFilters, CategoryOption } from '../../core/models/category.model';
import { Pagination } from '../../core/models/api.model';
import { CategoryService } from '../../core/services/category.service';
import { ToastService } from '../../core/services/toast.service';
import { flattenCategoryTree } from '../../core/utils/category-tree';
import { getErrorMessage } from '../../core/utils/http-error';
import { assetUrl } from '../../core/utils/asset-url';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { CategoryForm, CategoryFormData } from './category-form/category-form';

@Component({
  selector: 'app-categories',
  imports: [FormsModule, MatMenuModule],
  templateUrl: './categories.html',
})
export class Categories implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();

  protected readonly assetUrl = assetUrl;
  protected readonly pageSizes = [10, 20, 50, 100];
  protected readonly skeletonRows = Array.from({ length: 6 });

  protected readonly categories = signal<Category[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyIds = signal<Set<number>>(new Set());
  protected readonly selected = signal<Set<number>>(new Set());
  private readonly tree = signal<CategoryOption[]>([]);

  protected search = '';
  protected status: '' | 'active' | 'inactive' = '';
  protected page = 1;
  protected limit = 10;

  protected readonly allSelected = computed(
    () => this.categories().length > 0 && this.categories().every((c) => this.selected().has(c.id)),
  );
  protected readonly someSelected = computed(() => this.selected().size > 0 && !this.allSelected());

  // "Showing 1 to 10 of 42 entries"
  protected readonly range = computed(() => {
    const p = this.pagination();
    if (!p || !p.total) return null;
    const from = (p.page - 1) * p.limit + 1;
    return { from, to: Math.min(from + this.categories().length - 1, p.total), total: p.total };
  });

  // Up to 5 page numbers centred on the current page.
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
    this.loadParents();
  }

  protected load(): void {
    const filters: CategoryFilters = {
      page: this.page,
      limit: this.limit,
      search: this.search.trim() || undefined,
      status: this.status || undefined,
    };
    this.loading.set(true);
    this.error.set(null);
    this.selected.set(new Set());
    this.categoryService.list(filters).subscribe({
      next: (res) => {
        this.categories.set(res.data);
        this.pagination.set(res.pagination);
        this.loading.set(false);
        // Deleting the last row of a page leaves it empty; step back one page.
        if (!res.data.length && this.page > 1) {
          this.page--;
          this.load();
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(getErrorMessage(err, 'Could not load categories'));
      },
    });
  }

  private loadParents(): void {
    this.categoryService.tree().subscribe({
      next: (tree) => this.tree.set(tree),
      error: () => this.tree.set([]),
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

  protected isBusy(id: number): boolean {
    return this.busyIds().has(id);
  }

  protected toggleRow(id: number): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected toggleAll(): void {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.categories().map((c) => c.id)));
  }

  // category null = add. The parent dropdown leaves out the edited category and its sub-categories.
  protected openForm(category: Category | null = null): void {
    const data: CategoryFormData = {
      category,
      parentOptions: flattenCategoryTree(this.tree(), category?.id ?? null),
    };
    this.dialog
      .open<CategoryForm, CategoryFormData, Category>(CategoryForm, { data, width: '520px', autoFocus: '#category-name' })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.toast.success(category ? `"${saved.name}" updated` : `"${saved.name}" created`);
        this.load();
        this.loadParents();
      });
  }

  protected toggleStatus(category: Category): void {
    this.setBusy([category.id], true);
    this.categoryService.setStatus(category.id, !category.is_active).subscribe({
      next: (res) => {
        this.setBusy([category.id], false);
        this.categories.update((list) => list.map((c) => (c.id === category.id ? { ...c, is_active: res.data.is_active } : c)));
        this.toast.success(res.message);
        this.loadParents();
      },
      error: (err) => {
        this.setBusy([category.id], false);
        this.toast.error(getErrorMessage(err, 'Could not change status'));
      },
    });
  }

  protected confirmDelete(category: Category): void {
    this.confirm({
      title: 'Delete category?',
      message: `"${category.name}" will be permanently deleted. Categories with sub-categories or products can't be deleted.`,
      confirmText: 'Delete',
      danger: true,
    }).subscribe((ok) => {
      if (ok) this.runBulk([category], (c) => this.categoryService.remove(c.id), 'deleted');
    });
  }

  // Bulk actions on the checked rows. The API has no bulk endpoint, so each row is its own request.
  protected bulkStatus(isActive: boolean): void {
    const rows = this.selectedRows().filter((c) => c.is_active !== isActive);
    if (!rows.length) {
      this.toast.success(`Selected categories are already ${isActive ? 'active' : 'inactive'}`);
      return;
    }
    this.runBulk(rows, (c) => this.categoryService.setStatus(c.id, isActive), isActive ? 'activated' : 'deactivated');
  }

  protected bulkDelete(): void {
    const rows = this.selectedRows();
    this.confirm({
      title: `Delete ${rows.length} ${rows.length === 1 ? 'category' : 'categories'}?`,
      message: 'They will be permanently deleted. Any with sub-categories or products will be skipped.',
      confirmText: 'Delete',
      danger: true,
    }).subscribe((ok) => {
      if (ok) this.runBulk(rows, (c) => this.categoryService.remove(c.id), 'deleted');
    });
  }

  private selectedRows(): Category[] {
    return this.categories().filter((c) => this.selected().has(c.id));
  }

  private confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data, width: '440px', autoFocus: false })
      .afterClosed()
      .pipe(map((ok) => !!ok));
  }

  // Runs one request per row, then reports how many worked and the first failure reason.
  private runBulk(rows: Category[], request: (c: Category) => Observable<unknown>, verb: string): void {
    const ids = rows.map((c) => c.id);
    this.setBusy(ids, true);
    forkJoin(
      rows.map((c) =>
        request(c).pipe(
          map(() => null),
          catchError((err) => of(`${c.name}: ${getErrorMessage(err)}`)),
        ),
      ),
    ).subscribe((results) => {
      this.setBusy(ids, false);
      const failures = results.filter((r): r is string => r !== null);
      const done = rows.length - failures.length;
      if (done) {
        this.toast.success(rows.length === 1 ? `"${rows[0].name}" ${verb}` : `${done} ${done === 1 ? 'category' : 'categories'} ${verb}`);
      }
      if (failures.length) {
        this.toast.error(failures.length === 1 ? failures[0] : `${failures.length} failed. ${failures[0]}`);
      }
      this.load();
      this.loadParents();
    });
  }

  private setBusy(ids: number[], busy: boolean): void {
    this.busyIds.update((set) => {
      const next = new Set(set);
      for (const id of ids) {
        if (busy) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }
}
