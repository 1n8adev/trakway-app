import { Component, OnDestroy, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { OfferType, PRODUCT_LIMITS, ProductBasicPayload, ProductDetails, ProductImage } from '../../../../../core/models/product.model';
import { ProductService } from '../../../../../core/services/product.service';
import { CategoryService } from '../../../../../core/services/category.service';
import { FlatCategoryOption, flattenCategoryTree } from '../../../../../core/utils/category-tree';
import { getErrorMessage, getFieldErrors } from '../../../../../core/utils/http-error';
import { applyServerErrors, controlError } from '../../../../../core/utils/form-errors';
import { slugify } from '../../../../../core/utils/slugify';
import { assetUrl } from '../../../../../core/utils/asset-url';
import { FIELD_BASE, fieldState } from '../../../../../core/utils/ui';
import { previewPrice, pricingErrors, rupees } from '../../../../../core/utils/pricing';

type Field =
  | 'category_id'
  | 'name'
  | 'slug'
  | 'feature'
  | 'short_description'
  | 'long_description'
  | 'price'
  | 'offer_value'
  | 'sort_order';

const LABELS: Record<Field, string> = {
  category_id: 'Category',
  name: 'Product name',
  slug: 'Slug',
  feature: 'Feature',
  short_description: 'Short description',
  long_description: 'Long description',
  price: 'Price',
  offer_value: 'Offer',
  sort_order: 'Sort order',
};

interface NewImage {
  file: File;
  url: string;
}

const notBlank = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

// Tab 1. With no product it creates one (POST /products); otherwise saves PUT /products/:id/basic.
@Component({
  selector: 'app-product-basic-info',
  imports: [ReactiveFormsModule],
  templateUrl: './basic-info.html',
})
export class BasicInfoTab implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);

  readonly product = input<ProductDetails | null>(null);
  readonly saved = output<ProductDetails>();
  readonly dirtyChange = output<boolean>();

  protected readonly limits = PRODUCT_LIMITS;
  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly assetUrl = assetUrl;
  protected readonly rupees = rupees;

  protected readonly form = this.fb.nonNullable.group({
    category_id: [null as number | null, Validators.required],
    name: ['', [Validators.required, notBlank, Validators.maxLength(200)]],
    slug: ['', Validators.maxLength(220)],
    feature: ['', Validators.maxLength(255)],
    short_description: [''],
    long_description: [''],
    // Optional: products sold through combinations are priced in the Combinations tab.
    price: [null as number | string | null],
    offer_type: ['' as OfferType | ''],
    offer_value: [null as number | string | null],
    sort_order: [0, [Validators.required, Validators.pattern(/^-?\d+$/)]],
    is_active: [true],
  });

  protected readonly categories = signal<FlatCategoryOption[]>([]);
  protected readonly categoriesLoading = signal(true);

  protected readonly featureList = signal<string[]>([]);
  protected readonly featureDraft = signal('');
  protected readonly featureError = signal<string | null>(null);

  protected readonly existingImages = signal<ProductImage[]>([]);
  protected readonly removeIds = signal<Set<number>>(new Set());
  protected readonly newImages = signal<NewImage[]>([]);
  protected readonly imagesError = signal<string | null>(null);
  protected readonly dragging = signal(false);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly dirty = signal(false);
  private slugTouched = false;

  protected readonly isCreate = computed(() => !this.product());
  // Live selling-price preview, updated from the pricing controls.
  protected readonly pricePreview = signal(previewPrice(null, '', null));

  protected readonly imageCount = computed(
    () => this.existingImages().length - this.removeIds().size + this.newImages().length,
  );

  constructor() {
    effect(() => this.dirtyChange.emit(this.dirty()));
  }

  ngOnInit(): void {
    this.reset(this.product());
    this.form.valueChanges.subscribe(() => this.dirty.set(this.form.dirty || this.dirty()));
    const updatePreview = () => {
      const { price, offer_type, offer_value } = this.form.getRawValue();
      this.pricePreview.set(previewPrice(price, offer_type, offer_value));
    };
    updatePreview();
    this.form.valueChanges.subscribe(updatePreview);
    this.form.controls.name.valueChanges.subscribe((name) => {
      if (!this.slugTouched) this.form.controls.slug.setValue(slugify(name), { emitEvent: false });
    });
    this.categoryService.tree().subscribe({
      next: (tree) => {
        this.categories.set(flattenCategoryTree(tree));
        this.categoriesLoading.set(false);
      },
      error: () => this.categoriesLoading.set(false),
    });
  }

  ngOnDestroy(): void {
    this.newImages().forEach((img) => URL.revokeObjectURL(img.url));
  }

  protected fieldError(field: Field): string | null {
    const control = this.form.controls[field];
    return control.touched ? controlError(control, LABELS[field]) : null;
  }

  protected fieldClass(field: Field): string {
    return fieldState(!!this.fieldError(field));
  }

  protected indent(depth: number): string {
    return '    '.repeat(depth);
  }

  protected onSlugInput(): void {
    this.slugTouched = this.form.controls.slug.value.trim() !== '';
  }

  protected onOfferTypeChange(type: OfferType | ''): void {
    this.form.controls.offer_type.setValue(type);
    if (!type) this.form.controls.offer_value.setValue(null);
    this.form.controls.offer_value.setErrors(null);
    this.form.controls.price.updateValueAndValidity();
    this.form.markAsDirty();
  }

  protected onStatusChange(value: string): void {
    this.form.controls.is_active.setValue(value === 'active');
    this.form.markAsDirty();
  }

  // ----- Feature list (tags) -----

  protected onFeatureKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commitFeature();
    } else if (event.key === 'Backspace' && !this.featureDraft() && this.featureList().length) {
      this.featureList.update((list) => list.slice(0, -1));
      this.dirty.set(true);
    }
  }

  protected commitFeature(): void {
    const value = this.featureDraft().trim();
    if (!value) return;
    if (value.length > 100) return this.featureError.set('Each item must be at most 100 characters');
    if (this.featureList().some((f) => f.toLowerCase() === value.toLowerCase())) {
      return this.featureError.set(`"${value}" is already in the list`);
    }
    if (this.featureList().length >= PRODUCT_LIMITS.maxFeatureList) {
      return this.featureError.set(`At most ${PRODUCT_LIMITS.maxFeatureList} items are allowed`);
    }
    this.featureList.update((list) => [...list, value]);
    this.featureDraft.set('');
    this.featureError.set(null);
    this.dirty.set(true);
  }

  protected removeFeature(index: number): void {
    this.featureList.update((list) => list.filter((_, i) => i !== index));
    this.dirty.set(true);
  }

  // ----- Images -----

  protected onFilesSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    this.addFiles(Array.from(inputEl.files ?? []));
    inputEl.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  protected toggleRemoveExisting(id: number): void {
    this.removeIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    this.imagesError.set(null);
    this.dirty.set(true);
  }

  protected removeNew(index: number): void {
    const img = this.newImages()[index];
    URL.revokeObjectURL(img.url);
    this.newImages.update((list) => list.filter((_, i) => i !== index));
    this.imagesError.set(null);
    this.dirty.set(true);
  }

  // ----- Save -----

  protected submit(): void {
    if (this.featureDraft().trim()) this.commitFeature();
    this.checkPricing();
    const count = this.imageCount();
    if (count < PRODUCT_LIMITS.minImages) {
      this.imagesError.set(`Add at least ${PRODUCT_LIMITS.minImages} ${PRODUCT_LIMITS.minImages === 1 ? 'image' : 'images'}`);
    }
    else if (count > PRODUCT_LIMITS.maxImages) this.imagesError.set(`A product can have at most ${PRODUCT_LIMITS.maxImages} images`);
    if (this.form.invalid || this.imagesError()) {
      this.form.markAllAsTouched();
      this.error.set('Please fix the highlighted fields.');
      return;
    }

    const v = this.form.getRawValue();
    const payload: ProductBasicPayload = {
      category_id: v.category_id!,
      name: v.name.trim(),
      feature: v.feature.trim() || null,
      short_description: v.short_description.trim() || null,
      long_description: v.long_description.trim() || null,
      feature_list: this.featureList(),
      price: v.price === null || String(v.price).trim() === '' ? null : Number(v.price),
      offer_type: v.offer_type || null,
      offer_value: v.offer_type ? Number(v.offer_value) : null,
      sort_order: Number(v.sort_order),
      is_active: v.is_active,
    };
    if (v.slug.trim()) payload.slug = v.slug.trim();

    const files = this.newImages().map((img) => img.file);
    const product = this.product();
    const request = product
      ? this.productService.updateBasic(product.id, { ...payload, remove_image_ids: [...this.removeIds()] }, files)
      : this.productService.create(payload, files);

    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.reset(res.data);
        this.saved.emit(res.data);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(err, 'Could not save the product'));
        const fieldErrors = getFieldErrors(err);
        applyServerErrors(this.form, fieldErrors);
        if (fieldErrors['images']) this.imagesError.set(fieldErrors['images']);
        if (fieldErrors['feature_list']) this.featureError.set(fieldErrors['feature_list']);
      },
    });
  }

  // Loads the form from a product (or blank for create) and clears unsaved state.
  private reset(product: ProductDetails | null): void {
    this.form.reset({
      category_id: product?.category_id ?? null,
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      feature: product?.feature ?? '',
      short_description: product?.short_description ?? '',
      long_description: product?.long_description ?? '',
      price: product?.price ?? null,
      offer_type: product?.offer_type ?? '',
      offer_value: product?.offer_value ?? null,
      sort_order: product?.sort_order ?? 0,
      is_active: product?.is_active ?? true,
    });
    this.slugTouched = !!product;
    this.featureList.set([...(product?.feature_list ?? [])]);
    this.featureDraft.set('');
    this.featureError.set(null);
    this.existingImages.set(product?.images ?? []);
    this.removeIds.set(new Set());
    this.newImages().forEach((img) => URL.revokeObjectURL(img.url));
    this.newImages.set([]);
    this.imagesError.set(null);
    this.dirty.set(false);
  }

  // Puts price/offer problems on the controls (as `server` errors, shown by controlError()).
  private checkPricing(): void {
    const { price, offer_type, offer_value } = this.form.getRawValue();
    const errors = pricingErrors(price, offer_type, offer_value, { priceRequired: false });
    for (const field of ['price', 'offer_value'] as const) {
      const control = this.form.controls[field];
      const message = errors[field];
      control.setErrors(message ? { server: message } : null);
      if (message) control.markAsTouched();
    }
  }

  private addFiles(files: File[]): void {
    const accepted: NewImage[] = [];
    for (const file of files) {
      if (!(PRODUCT_LIMITS.imageTypes as readonly string[]).includes(file.type)) {
        this.imagesError.set(`"${file.name}" is not a JPG, PNG, WEBP or GIF image`);
        continue;
      }
      if (file.size > PRODUCT_LIMITS.maxImageBytes) {
        this.imagesError.set(`"${file.name}" is larger than 2 MB`);
        continue;
      }
      if (this.imageCount() + accepted.length >= PRODUCT_LIMITS.maxImages) {
        this.imagesError.set(`A product can have at most ${PRODUCT_LIMITS.maxImages} images`);
        break;
      }
      accepted.push({ file, url: URL.createObjectURL(file) });
    }
    if (accepted.length) {
      this.newImages.update((list) => [...list, ...accepted]);
      this.dirty.set(true);
      if (accepted.length === files.length) this.imagesError.set(null);
    }
  }
}
