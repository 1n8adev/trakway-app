import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Pagination } from '../../core/models/api.model';
import { FAQ_LIMITS, Faq } from '../../core/models/faq.model';
import { FaqService } from '../../core/services/faq.service';
import { ToastService } from '../../core/services/toast.service';
import { getErrorMessage } from '../../core/utils/http-error';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { FaqForm, FaqFormData } from './faq-form/faq-form';

@Component({
  selector: 'app-faqs',
  imports: [FormsModule, MatMenuModule, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder],
  templateUrl: './faqs.html',
})
export class Faqs implements OnInit {
  private readonly faqService = inject(FaqService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();

  // Load as many as the API allows so the whole list can be reordered at once.
  private readonly limit = FAQ_LIMITS.maxPageSize;

  protected readonly faqs = signal<Faq[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);
  protected readonly saveOrderBusy = signal(false);
  protected readonly expanded = signal<Set<number>>(new Set());

  protected search = '';
  protected status: '' | 'active' | 'inactive' = '';
  protected page = 1;

  // PUT /faqs/reorder renumbers only the ids sent, so drag & drop is allowed only when every FAQ is on screen.
  protected readonly canReorder = signal(false);
  protected readonly reorderHint = signal<string | null>(null);

  protected readonly activeCount = computed(() => this.faqs().filter((f) => f.is_active).length);

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
    this.loading.set(true);
    this.error.set(null);
    this.faqService
      .list({ page: this.page, limit: this.limit, search: this.search.trim() || undefined, status: this.status || undefined })
      .subscribe({
        next: (res) => {
          this.faqs.set(res.data);
          this.pagination.set(res.pagination);
          this.loading.set(false);
          this.updateReorderState(res.pagination);
          if (!res.data.length && this.page > 1) {
            this.page--;
            this.load();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load FAQs'));
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

  protected isExpanded(id: number): boolean {
    return this.expanded().has(id);
  }

  protected toggleExpanded(id: number): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected expandAll(open: boolean): void {
    this.expanded.set(open ? new Set(this.faqs().map((f) => f.id)) : new Set());
  }

  // Applies the new order right away and saves it; puts the old order back if saving fails.
  protected onDrop(event: CdkDragDrop<Faq[]>): void {
    if (!this.canReorder() || event.previousIndex === event.currentIndex) return;
    const before = this.faqs();
    const after = [...before];
    moveItemInArray(after, event.previousIndex, event.currentIndex);
    this.faqs.set(after.map((faq, i) => ({ ...faq, sort_order: i })));

    this.saveOrderBusy.set(true);
    this.faqService.reorder(after.map((f) => f.id)).subscribe({
      next: () => {
        this.saveOrderBusy.set(false);
        this.toast.success('FAQ order saved');
      },
      error: (err) => {
        this.saveOrderBusy.set(false);
        this.faqs.set(before);
        this.toast.error(getErrorMessage(err, 'Could not save the new order'));
      },
    });
  }

  // faq null = add.
  protected openForm(faq: Faq | null = null): void {
    this.dialog
      .open<FaqForm, FaqFormData, Faq>(FaqForm, { data: { faq }, width: '680px', autoFocus: '#faq-question' })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.toast.success(faq ? 'FAQ updated' : 'FAQ added');
        if (faq && this.matchesFilter(saved)) {
          this.faqs.update((list) => list.map((f) => (f.id === saved.id ? saved : f)));
        } else {
          this.load();
        }
      });
  }

  protected toggleStatus(faq: Faq): void {
    this.busyId.set(faq.id);
    this.faqService.setStatus(faq.id, !faq.is_active).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.toast.success(res.message);
        if (this.matchesFilter(res.data)) this.faqs.update((list) => list.map((f) => (f.id === faq.id ? res.data : f)));
        else this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(getErrorMessage(err, 'Could not change status'));
      },
    });
  }

  protected confirmDelete(faq: Faq): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete FAQ?',
          message: `"${faq.question}" will be permanently deleted.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '440px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.busyId.set(faq.id);
        this.faqService.remove(faq.id).subscribe({
          next: () => {
            this.busyId.set(null);
            this.toast.success('FAQ deleted');
            this.load();
          },
          error: (err) => {
            this.busyId.set(null);
            this.toast.error(getErrorMessage(err, 'Could not delete FAQ'));
          },
        });
      });
  }

  private matchesFilter(faq: Faq): boolean {
    return !this.status || (this.status === 'active') === faq.is_active;
  }

  private updateReorderState(p: Pagination): void {
    if (this.search.trim() || this.status) {
      this.canReorder.set(false);
      this.reorderHint.set('Clear the search and status filter to reorder FAQs.');
    } else if (p.totalPages > 1) {
      this.canReorder.set(false);
      this.reorderHint.set(`Drag & drop works for up to ${this.limit} FAQs on one page.`);
    } else {
      this.canReorder.set(p.total > 1);
      this.reorderHint.set(null);
    }
  }
}
