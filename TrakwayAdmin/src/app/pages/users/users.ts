import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Pagination } from '../../core/models/api.model';
import { UserSummary, WebsiteUser } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { getErrorMessage } from '../../core/utils/http-error';
import { confirmStatusChange } from './confirm-block';

type Tab = '' | 'active' | 'inactive';

// Customers who signed up on the website. Admins can only view and block / unblock them.
@Component({
  selector: 'app-users',
  imports: [FormsModule, MatMenuModule, DatePipe, RouterLink],
  templateUrl: './users.html',
})
export class Users implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();

  private readonly limit = 20;

  protected readonly tabs: { value: Tab; label: string; key: keyof UserSummary }[] = [
    { value: '', label: 'All', key: 'all' },
    { value: 'active', label: 'Active', key: 'active' },
    { value: 'inactive', label: 'Blocked', key: 'inactive' },
  ];

  protected readonly users = signal<WebsiteUser[]>([]);
  protected readonly summary = signal<UserSummary | null>(null);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  protected search = '';
  protected status: Tab = '';
  protected verified: '' | 'true' | 'false' = '';
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
    return !!(this.search.trim() || this.verified);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadSummary();
    this.userService
      .list({
        page: this.page,
        limit: this.limit,
        search: this.search.trim() || undefined,
        status: this.status || undefined,
        verified: this.verified || undefined,
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.pagination.set(res.pagination);
          this.loading.set(false);
          if (!res.data.length && this.page > 1) {
            this.page--;
            this.load();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load customers'));
        },
      });
  }

  private loadSummary(): void {
    this.userService.summary().subscribe({ next: (s) => this.summary.set(s), error: () => {} });
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
    this.load();
  }

  protected clearFilters(): void {
    this.search = '';
    this.verified = '';
    this.page = 1;
    this.load();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  protected initials(name: string): string {
    return (
      name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  }

  protected toggleStatus(user: WebsiteUser): void {
    confirmStatusChange(this.dialog, user).subscribe((ok) => {
      if (!ok) return;
      this.busyId.set(user.id);
      this.userService.setStatus(user.id, !user.is_active).subscribe({
        next: (res) => {
          this.busyId.set(null);
          this.toast.success(res.message);
          this.applyChange(res.data);
        },
        error: (err) => {
          this.busyId.set(null);
          this.toast.error(getErrorMessage(err, 'Could not change status'));
        },
      });
    });
  }

  // Swap the row in place when it still fits the current tab, otherwise reload.
  private applyChange(user: WebsiteUser): void {
    if (!this.status || (this.status === 'active') === user.is_active) {
      // The PATCH returns the full profile; the row only needs the status.
      this.users.update((list) => list.map((u) => (u.id === user.id ? { ...u, is_active: user.is_active } : u)));
      this.loadSummary();
    } else {
      this.load();
    }
  }
}
