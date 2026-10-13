import { Component, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ApiResponse } from '../../../core/models/api.model';
import { Attribute, AttributeValue } from '../../../core/models/attribute.model';
import { AttributeService } from '../../../core/services/attribute.service';
import { getErrorMessage } from '../../../core/utils/http-error';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog';

export interface AttributeValuesData {
  attribute: Attribute;
}

const MAX_TEXT = 100;

// Manages one attribute's values. Each action is saved immediately (the API has one endpoint per action).
// Closes with the latest Attribute when anything changed, so the list can refresh.
@Component({
  selector: 'app-attribute-values',
  templateUrl: './attribute-values.html',
})
export class AttributeValues {
  private readonly attributeService = inject(AttributeService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject<MatDialogRef<AttributeValues, Attribute | undefined>>(MatDialogRef);

  protected readonly attribute = signal<Attribute>(inject<AttributeValuesData>(MAT_DIALOG_DATA).attribute);
  private changed = false;

  // New value row
  protected readonly newValue = signal('');
  protected readonly newSort = signal<number>(this.nextSort(this.attribute()));
  protected readonly adding = signal(false);

  // Inline edit
  protected readonly editingId = signal<number | null>(null);
  protected readonly editValue = signal('');
  protected readonly editSort = signal<number>(0);

  protected readonly busyId = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly activeCount = computed(() => this.attribute().values.filter((v) => v.is_active).length);

  constructor() {
    // Clicking the backdrop or pressing Escape should still hand back the changes.
    this.dialogRef.backdropClick().subscribe(() => this.close());
    this.dialogRef.keydownEvents().subscribe((e) => {
      if (e.key === 'Escape') this.close();
    });
    this.dialogRef.disableClose = true;
  }

  protected close(): void {
    this.dialogRef.close(this.changed ? this.attribute() : undefined);
  }

  protected add(): void {
    const value = this.newValue().trim();
    const problem = this.validate(value);
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.adding.set(true);
    this.run(this.attributeService.addValue(this.attribute().id, { value, sort_order: this.newSort() }), () => {
      this.adding.set(false);
      this.newValue.set('');
      this.newSort.set(this.nextSort(this.attribute()));
    }, () => this.adding.set(false));
  }

  protected startEdit(v: AttributeValue): void {
    this.editingId.set(v.id);
    this.editValue.set(v.value);
    this.editSort.set(v.sort_order);
    this.error.set(null);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected saveEdit(v: AttributeValue): void {
    const value = this.editValue().trim();
    const problem = this.validate(value, v.id);
    if (problem) {
      this.error.set(problem);
      return;
    }
    if (value === v.value && this.editSort() === v.sort_order) {
      this.cancelEdit();
      return;
    }
    this.busyId.set(v.id);
    this.run(
      this.attributeService.updateValue(this.attribute().id, v.id, { value, sort_order: this.editSort() }),
      () => {
        this.busyId.set(null);
        this.editingId.set(null);
      },
      () => this.busyId.set(null),
    );
  }

  protected toggle(v: AttributeValue): void {
    this.busyId.set(v.id);
    this.run(
      this.attributeService.setValueStatus(this.attribute().id, v.id, !v.is_active),
      () => this.busyId.set(null),
      () => this.busyId.set(null),
    );
  }

  protected remove(v: AttributeValue): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete value?',
          message: `"${v.value}" will be removed from ${this.attribute().name}. Values used by product combinations can't be deleted.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '440px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.busyId.set(v.id);
        this.run(
          this.attributeService.removeValue(this.attribute().id, v.id),
          () => this.busyId.set(null),
          () => this.busyId.set(null),
        );
      });
  }

  protected toNumber(value: string): number {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? 0 : n;
  }

  // Every value endpoint returns the updated attribute; swap it in.
  private run(request: Observable<ApiResponse<Attribute>>, done: () => void, failed: () => void): void {
    this.error.set(null);
    request.subscribe({
      next: (res) => {
        this.attribute.set(res.data);
        this.changed = true;
        done();
      },
      error: (err) => {
        failed();
        this.error.set(getErrorMessage(err, 'Could not save the change'));
      },
    });
  }

  private validate(value: string, excludeId?: number): string | null {
    if (!value) return 'Value is required';
    if (value.length > MAX_TEXT) return `Value must be at most ${MAX_TEXT} characters`;
    const taken = this.attribute().values.some((v) => v.id !== excludeId && v.value.toLowerCase() === value.toLowerCase());
    return taken ? `"${value}" already exists for this attribute` : null;
  }

  private nextSort(attribute: Attribute): number {
    return attribute.values.length ? Math.max(...attribute.values.map((v) => v.sort_order)) + 1 : 0;
  }
}
