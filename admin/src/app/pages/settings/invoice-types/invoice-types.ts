import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { INVOICE_TYPE_LIMITS, VendorInvoiceType } from '../../../core/models/vendor-invoice.model';
import { ToastService } from '../../../core/services/toast.service';
import { VendorInvoiceTypeService } from '../../../core/services/vendor-invoice-type.service';
import { todayIso } from '../../../core/utils/date';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog';

// Indian financial year of today, e.g. "2026-27" (same rule as the API).
function currentFinancialYear(): string {
  const [year, month] = todayIso().split('-').map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

// Settings > Invoice Settings: the vendor invoice types (Sales Invoice, Renewal Invoice, ...) and their number prefixes.
// One row is edited at a time; editing === 'new' shows the add row.
@Component({
  selector: 'app-invoice-types',
  imports: [NgTemplateOutlet, ReactiveFormsModule],
  templateUrl: './invoice-types.html',
})
export class InvoiceTypes {
  private readonly fb = inject(FormBuilder);
  private readonly typeService = inject(VendorInvoiceTypeService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly fieldState = fieldState;
  protected readonly limits = INVOICE_TYPE_LIMITS;
  protected readonly fy = currentFinancialYear();

  protected readonly types = signal<VendorInvoiceType[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly editing = signal<number | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly busyId = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(INVOICE_TYPE_LIMITS.maxName)]],
    prefix: ['', [Validators.required, Validators.pattern(INVOICE_TYPE_LIMITS.prefixPattern)]],
  });

  constructor() {
    this.typeService
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (types) => {
          this.types.set(types);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.loadError.set(getErrorMessage(err, 'Could not load invoice types'));
        },
      });
  }

  protected example(prefix: string): string {
    return `${prefix || 'PREFIX'}/${this.fy}/0001`;
  }

  protected startAdd(): void {
    this.form.reset({ name: '', prefix: '' });
    this.form.controls.prefix.enable();
    this.error.set(null);
    this.editing.set('new');
  }

  protected startEdit(type: VendorInvoiceType): void {
    this.form.reset({ name: type.name, prefix: type.prefix });
    // The prefix is part of existing invoice numbers, so it's locked once used.
    if (type.invoice_count > 0) this.form.controls.prefix.disable();
    else this.form.controls.prefix.enable();
    this.error.set(null);
    this.editing.set(type.id);
  }

  protected cancelEdit(): void {
    this.editing.set(null);
    this.error.set(null);
  }

  // Uppercase as the user types, like the API does.
  protected onPrefixInput(): void {
    const control = this.form.controls.prefix;
    const upper = control.value.toUpperCase();
    if (upper !== control.value) control.setValue(upper);
  }

  protected fieldError(field: 'name' | 'prefix'): string | null {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return null;
    if (control.hasError('server')) return control.getError('server');
    if (control.hasError('required')) return field === 'name' ? 'Enter a name' : 'Enter a prefix';
    if (control.hasError('maxlength')) return `At most ${INVOICE_TYPE_LIMITS.maxName} characters`;
    if (control.hasError('pattern')) return 'Up to 10 letters, digits or "-"';
    return 'Invalid';
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const editing = this.editing();
    const { name, prefix } = this.form.getRawValue();
    const payload = this.form.controls.prefix.disabled ? { name: name.trim() } : { name: name.trim(), prefix: prefix.trim() };
    const request = editing === 'new' ? this.typeService.create(payload) : this.typeService.update(editing as number, payload);
    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.upsert(res.data);
        this.editing.set(null);
        this.toast.success(res.message);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(err, 'Could not save the invoice type'));
        const errors = getFieldErrors(err);
        for (const field of ['name', 'prefix'] as const) {
          if (errors[field]) {
            this.form.controls[field].setErrors({ server: errors[field] });
            this.form.controls[field].markAsTouched();
          }
        }
      },
    });
  }

  protected toggleActive(type: VendorInvoiceType): void {
    this.busyId.set(type.id);
    this.typeService.setStatus(type.id, !type.is_active).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.upsert(res.data);
        this.toast.success(res.message);
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(getErrorMessage(err, 'Could not change the status'));
      },
    });
  }

  protected confirmDelete(type: VendorInvoiceType): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: `Delete ${type.name}?`,
          message: `The ${type.prefix} number series will be removed. This can't be undone.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '420px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.busyId.set(type.id);
        this.typeService.remove(type.id).subscribe({
          next: (res) => {
            this.busyId.set(null);
            this.types.update((list) => list.filter((t) => t.id !== type.id));
            this.toast.success(res.message);
          },
          error: (err) => {
            this.busyId.set(null);
            this.toast.error(getErrorMessage(err, 'Could not delete the invoice type'));
          },
        });
      });
  }

  private upsert(type: VendorInvoiceType): void {
    this.types.update((list) =>
      list.some((t) => t.id === type.id) ? list.map((t) => (t.id === type.id ? type : t)) : [...list, type],
    );
  }
}
