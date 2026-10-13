import { Component, OnDestroy, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BenefitPayload, PRODUCT_LIMITS, ProductDetails } from '../../../../../core/models/product.model';
import { ProductService } from '../../../../../core/services/product.service';
import { getErrorMessage, getFieldErrors } from '../../../../../core/utils/http-error';
import { assetUrl } from '../../../../../core/utils/asset-url';
import { FIELD_BASE, fieldState } from '../../../../../core/utils/ui';

interface BenefitRow {
  key: number;
  title: string;
  description: string;
  // Existing image path kept on save (null = none / removed).
  image: string | null;
  file: File | null;
  preview: string | null;
}

// Tab 2. PUT /products/:id/benefits replaces the whole list.
@Component({
  selector: 'app-product-benefits',
  imports: [FormsModule],
  templateUrl: './benefits.html',
})
export class BenefitsTab implements OnInit, OnDestroy {
  private readonly productService = inject(ProductService);

  readonly product = input.required<ProductDetails>();
  readonly saved = output<ProductDetails>();
  readonly dirtyChange = output<boolean>();

  protected readonly limits = PRODUCT_LIMITS;
  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly fieldState = fieldState;

  protected readonly rows = signal<BenefitRow[]>([]);
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

  ngOnDestroy(): void {
    this.revokeAll();
  }

  protected touch(): void {
    this.dirty.set(true);
  }

  protected add(): void {
    if (this.rows().length >= PRODUCT_LIMITS.maxBenefits) return;
    this.rows.update((list) => [...list, this.blank()]);
    this.touch();
  }

  protected remove(index: number): void {
    const row = this.rows()[index];
    if (row.preview) URL.revokeObjectURL(row.preview);
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

  protected onImageSelected(index: number, event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    const key = `benefits[${index}].image`;
    if (!(PRODUCT_LIMITS.imageTypes as readonly string[]).includes(file.type)) {
      this.errors.update((e) => ({ ...e, [key]: 'Image must be JPG, PNG, WEBP or GIF' }));
      return;
    }
    if (file.size > PRODUCT_LIMITS.maxImageBytes) {
      this.errors.update((e) => ({ ...e, [key]: 'Image must be 2 MB or smaller' }));
      return;
    }
    this.updateRow(index, (row) => {
      if (row.preview) URL.revokeObjectURL(row.preview);
      return { ...row, file, preview: URL.createObjectURL(file) };
    });
    this.clearError(key);
  }

  protected removeImage(index: number): void {
    this.updateRow(index, (row) => {
      if (row.preview) URL.revokeObjectURL(row.preview);
      return { ...row, file: null, preview: null, image: null };
    });
  }

  protected imageSrc(row: BenefitRow): string | null {
    return row.preview ?? assetUrl(row.image);
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
      if (!row.title.trim()) errors[`benefits[${i}].title`] = 'Title is required';
      else if (row.title.trim().length > 200) errors[`benefits[${i}].title`] = 'Title must be at most 200 characters';
    });
    this.errors.set(errors);
    if (Object.keys(errors).length) {
      this.error.set('Please fix the highlighted benefits.');
      return;
    }

    const rows = this.rows();
    const payload: BenefitPayload[] = rows.map((row) => ({
      title: row.title.trim(),
      description: row.description.trim() || null,
      image: row.file ? null : row.image,
    }));

    this.saving.set(true);
    this.error.set(null);
    this.productService.updateBenefits(this.product().id, payload, rows.map((r) => r.file)).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.reset(res.data);
        this.saved.emit(res.data);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(err, 'Could not save benefits'));
        this.errors.set(getFieldErrors(err));
      },
    });
  }

  private updateRow(index: number, change: (row: BenefitRow) => BenefitRow): void {
    this.rows.update((list) => list.map((row, i) => (i === index ? change(row) : row)));
    this.touch();
  }

  private reset(product: ProductDetails): void {
    this.revokeAll();
    this.rows.set(
      product.benefits.map((b) => ({
        key: this.nextKey++,
        title: b.title,
        description: b.description ?? '',
        image: b.image,
        file: null,
        preview: null,
      })),
    );
    this.errors.set({});
    this.dirty.set(false);
  }

  private blank(): BenefitRow {
    return { key: this.nextKey++, title: '', description: '', image: null, file: null, preview: null };
  }

  private revokeAll(): void {
    this.rows().forEach((row) => row.preview && URL.revokeObjectURL(row.preview));
  }
}
