import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, catchError, debounceTime, distinctUntilChanged, forkJoin, map, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { ClientLogo, ClientLogoFilters } from '../../core/models/client-logo.model';
import { Pagination } from '../../core/models/api.model';
import { ClientLogoService } from '../../core/services/client-logo.service';
import { ToastService } from '../../core/services/toast.service';
import { getErrorMessage } from '../../core/utils/http-error';
import { assetUrl } from '../../core/utils/asset-url';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { ClientLogoForm, ClientLogoFormData } from './client-logo-form/client-logo-form';

@Component({
  selector: 'app-client-logos',
  imports: [FormsModule, MatMenuModule],
  templateUrl: './client-logos.html',
})
export class ClientLogos implements OnInit {
  private readonly clientLogoService = inject(ClientLogoService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();

  protected readonly assetUrl = assetUrl;
  protected readonly pageSizes = [10, 20, 50, 100];
  protected readonly skeletonRows = Array.from({ length: 6 });

  protected readonly logos = signal<ClientLogo[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyIds = signal<Set<number>>(new Set());
  protected readonly selected = signal<Set<number>>(new Set());

  protected search = '';
  protected status: '' | 'active' | 'inactive' = '';
  protected page = 1;
  protected limit = 10;

  protected readonly allSelected = computed(
    () => this.logos().length > 0 && this.logos().every((l) => this.selected().has(l.id)),
  );
  protected readonly someSelected = computed(() => this.selected().size > 0 && !this.allSelected());

  // "Showing 1 to 10 of 42 entries"
  protected readonly range = computed(() => {
    const p = this.pagination();
    if (!p || !p.total) return null;
    const from = (p.page - 1) * p.limit + 1;
    return { from, to: Math.min(from + this.logos().length - 1, p.total), total: p.total };
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
  }

  protected load(): void {
    const filters: ClientLogoFilters = {
      page: this.page,
      limit: this.limit,
      search: this.search.trim() || undefined,
      status: this.status || undefined,
    };
    this.loading.set(true);
    this.error.set(null);
    this.selected.set(new Set());
    this.clientLogoService.list(filters).subscribe({
      next: (res) => {
        this.logos.set(res.data);
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
        this.error.set(getErrorMessage(err, 'Could not load client logos'));
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
    this.selected.set(this.allSelected() ? new Set() : new Set(this.logos().map((l) => l.id)));
  }

  // logo null = add.
  protected openForm(logo: ClientLogo | null = null): void {
    this.dialog
      .open<ClientLogoForm, ClientLogoFormData, ClientLogo>(ClientLogoForm, {
        data: { logo },
        width: '520px',
        autoFocus: logo ? '#client-logo-name' : '#client-logo-image',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.toast.success(logo ? `"${saved.name}" updated` : `"${saved.name}" added`);
        this.load();
      });
  }

  protected toggleStatus(logo: ClientLogo): void {
    this.setBusy([logo.id], true);
    this.clientLogoService.setStatus(logo.id, !logo.is_active).subscribe({
      next: (res) => {
        this.setBusy([logo.id], false);
        this.logos.update((list) => list.map((l) => (l.id === logo.id ? { ...l, is_active: res.data.is_active } : l)));
        this.toast.success(res.message);
      },
      error: (err) => {
        this.setBusy([logo.id], false);
        this.toast.error(getErrorMessage(err, 'Could not change status'));
      },
    });
  }

  protected confirmDelete(logo: ClientLogo): void {
    this.confirm({
      title: 'Delete client logo?',
      message: `"${logo.name}" and its image will be permanently deleted.`,
      confirmText: 'Delete',
      danger: true,
    }).subscribe((ok) => {
      if (ok) this.runBulk([logo], (l) => this.clientLogoService.remove(l.id), 'deleted');
    });
  }

  // Bulk actions on the checked rows. The API has no bulk endpoint, so each row is its own request.
  protected bulkStatus(isActive: boolean): void {
    const rows = this.selectedRows().filter((l) => l.is_active !== isActive);
    if (!rows.length) {
      this.toast.success(`Selected logos are already ${isActive ? 'active' : 'inactive'}`);
      return;
    }
    this.runBulk(rows, (l) => this.clientLogoService.setStatus(l.id, isActive), isActive ? 'activated' : 'deactivated');
  }

  protected bulkDelete(): void {
    const rows = this.selectedRows();
    this.confirm({
      title: `Delete ${rows.length} ${rows.length === 1 ? 'logo' : 'logos'}?`,
      message: 'They and their images will be permanently deleted.',
      confirmText: 'Delete',
      danger: true,
    }).subscribe((ok) => {
      if (ok) this.runBulk(rows, (l) => this.clientLogoService.remove(l.id), 'deleted');
    });
  }

  private selectedRows(): ClientLogo[] {
    return this.logos().filter((l) => this.selected().has(l.id));
  }

  private confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data, width: '440px', autoFocus: false })
      .afterClosed()
      .pipe(map((ok) => !!ok));
  }

  // Runs one request per row, then reports how many worked and the first failure reason.
  private runBulk(rows: ClientLogo[], request: (l: ClientLogo) => Observable<unknown>, verb: string): void {
    const ids = rows.map((l) => l.id);
    this.setBusy(ids, true);
    forkJoin(
      rows.map((l) =>
        request(l).pipe(
          map(() => null),
          catchError((err) => of(`${l.name}: ${getErrorMessage(err)}`)),
        ),
      ),
    ).subscribe((results) => {
      this.setBusy(ids, false);
      const failures = results.filter((r): r is string => r !== null);
      const done = rows.length - failures.length;
      if (done) {
        this.toast.success(rows.length === 1 ? `"${rows[0].name}" ${verb}` : `${done} ${done === 1 ? 'logo' : 'logos'} ${verb}`);
      }
      if (failures.length) {
        this.toast.error(failures.length === 1 ? failures[0] : `${failures.length} failed. ${failures[0]}`);
      }
      this.load();
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
