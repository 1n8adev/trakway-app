import { Component, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PRODUCT_LIMITS, ProductDetails } from '../../../../../core/models/product.model';
import { ProductService } from '../../../../../core/services/product.service';
import { getErrorMessage, getFieldErrors } from '../../../../../core/utils/http-error';
import { FIELD_BASE, fieldState } from '../../../../../core/utils/ui';
import { RichEditor } from '../../../../../shared/rich-editor/rich-editor';

interface SectionRow {
  key: number;
  title: string;
  description: string | null;
}

// Tab 3. PUT /products/:id/specifications replaces the whole list of { title, description (HTML) }.
@Component({
  selector: 'app-product-specifications',
  imports: [FormsModule, RichEditor],
  templateUrl: './specifications.html',
})
export class SpecificationsTab implements OnInit {
  private readonly productService = inject(ProductService);

  readonly product = input.required<ProductDetails>();
  readonly saved = output<ProductDetails>();
  readonly dirtyChange = output<boolean>();

  protected readonly limits = PRODUCT_LIMITS;
  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly fieldState = fieldState;

  protected readonly rows = signal<SectionRow[]>([]);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly dirty = signal(false);
  private nextKey = 1;

  constructor() {
    effect(() => this.dirtyChange.emit(this.dirty()));
  }

  ngOnInit(): void {
    this.reset(this.product());
  }

  protected touch(): void {
    this.dirty.set(true);
  }

  protected add(): void {
    if (this.rows().length >= PRODUCT_LIMITS.maxSpecSections) return;
    this.rows.update((list) => [...list, { key: this.nextKey++, title: '', description: null }]);
    this.touch();
  }

  protected remove(index: number): void {
    this.rows.update((list) => list.filter((_, i) => i !== index));
    this.errors.set({});
    this.touch();
  }

  protected move(index: number, delta: -1 | 1): void {
    const target = index + delta;
    this.rows.update((list) => {
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    this.errors.set({});
    this.touch();
  }

  protected clearError(key: string): void {
    if (!this.errors()[key]) return;
    this.errors.update((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  protected submit(): void {
    const errors: Record<string, string> = {};
    this.rows().forEach((row, i) => {
      if (!row.title.trim()) errors[`specifications[${i}].title`] = 'Section title is required';
      else if (row.title.trim().length > 200) errors[`specifications[${i}].title`] = 'Section title must be at most 200 characters';
    });
    this.errors.set(errors);
    if (Object.keys(errors).length) {
      this.error.set('Please fix the highlighted sections.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const payload = this.rows().map((row) => ({ title: row.title.trim(), description: row.description }));
    this.productService.updateSpecifications(this.product().id, payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.reset(res.data);
        this.saved.emit(res.data);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(err, 'Could not save specifications'));
        this.errors.set(getFieldErrors(err));
      },
    });
  }

  private reset(product: ProductDetails): void {
    this.rows.set(
      (product.specifications ?? []).map((s) => ({ key: this.nextKey++, title: s.title, description: s.description })),
    );
    this.errors.set({});
    this.dirty.set(false);
  }
}
