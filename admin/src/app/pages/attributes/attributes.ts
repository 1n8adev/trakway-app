import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Attribute } from '../../core/models/attribute.model';
import { AttributeService } from '../../core/services/attribute.service';
import { ToastService } from '../../core/services/toast.service';
import { getErrorMessage } from '../../core/utils/http-error';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { AttributeForm, AttributeFormData } from './attribute-form/attribute-form';
import { AttributeValues, AttributeValuesData } from './attribute-values/attribute-values';

// How many value chips to show in a row before "+N more".
const VISIBLE_VALUES = 5;

@Component({
  selector: 'app-attributes',
  imports: [FormsModule, MatMenuModule],
  templateUrl: './attributes.html',
})
export class Attributes implements OnInit {
  private readonly attributeService = inject(AttributeService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();

  protected readonly visibleValues = VISIBLE_VALUES;
  protected readonly skeletonRows = Array.from({ length: 4 });

  protected readonly attributes = signal<Attribute[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  protected search = '';
  protected status: '' | 'active' | 'inactive' = '';

  protected readonly totalValues = computed(() => this.attributes().reduce((sum, a) => sum + a.values.length, 0));

  constructor() {
    this.search$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed()).subscribe(() => this.load());
  }

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.attributeService.list({ search: this.search.trim() || undefined, status: this.status || undefined }).subscribe({
      next: (list) => {
        this.attributes.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(getErrorMessage(err, 'Could not load attributes'));
      },
    });
  }

  protected onSearch(value: string): void {
    this.search$.next(value);
  }

  // attribute null = add.
  protected openForm(attribute: Attribute | null = null): void {
    this.dialog
      .open<AttributeForm, AttributeFormData, Attribute>(AttributeForm, {
        data: { attribute },
        width: '520px',
        autoFocus: '#attribute-name',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.toast.success(attribute ? `"${saved.name}" updated` : `"${saved.name}" created`);
        this.replace(saved, !attribute);
      });
  }

  protected openValues(attribute: Attribute): void {
    this.dialog
      .open<AttributeValues, AttributeValuesData, Attribute | undefined>(AttributeValues, {
        data: { attribute },
        width: '640px',
        autoFocus: '#new-value',
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) this.replace(updated, false);
      });
  }

  protected toggleStatus(attribute: Attribute): void {
    this.busyId.set(attribute.id);
    this.attributeService.setStatus(attribute.id, !attribute.is_active).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.toast.success(res.message);
        this.replace(res.data, false);
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(getErrorMessage(err, 'Could not change status'));
      },
    });
  }

  protected confirmDelete(attribute: Attribute): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete attribute?',
          message: `"${attribute.name}" and its ${attribute.values.length} value(s) will be permanently deleted. Attributes used by product combinations can't be deleted.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '440px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.delete(attribute);
      });
  }

  private delete(attribute: Attribute): void {
    this.busyId.set(attribute.id);
    this.attributeService.remove(attribute.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(`"${attribute.name}" deleted`);
        this.attributes.update((list) => list.filter((a) => a.id !== attribute.id));
      },
      error: (err) => {
        this.busyId.set(null);
        // e.g. 409 "Attribute is used by product combinations..."
        this.toast.error(getErrorMessage(err, 'Could not delete attribute'));
      },
    });
  }

  // Swaps in a saved attribute. A new one, or a change that may move it in the sort/filter, reloads the list.
  private replace(saved: Attribute, isNew: boolean): void {
    const current = this.attributes().find((a) => a.id === saved.id);
    const orderChanged = !current || current.sort_order !== saved.sort_order || current.name !== saved.name;
    const filteredOut = (this.status === 'active' && !saved.is_active) || (this.status === 'inactive' && saved.is_active);
    if (isNew || orderChanged || filteredOut) {
      this.load();
      return;
    }
    this.attributes.update((list) => list.map((a) => (a.id === saved.id ? saved : a)));
  }
}
