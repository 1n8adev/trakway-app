import { Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { ProductDetails, ProductSeoPayload, SEO_LIMITS } from '../../../../../core/models/product.model';
import { ProductService } from '../../../../../core/services/product.service';
import { applyServerErrors, controlError } from '../../../../../core/utils/form-errors';
import { getErrorMessage, getFieldErrors } from '../../../../../core/utils/http-error';

type Field = 'seo_title' | 'seo_keywords' | 'seo_description' | 'seo_canonical_url' | 'seo_scripts';

const LABELS: Record<Field, string> = {
  seo_title: 'Meta title',
  seo_keywords: 'Meta keywords',
  seo_description: 'Meta description',
  seo_canonical_url: 'Canonical URL',
  seo_scripts: 'Scripts',
};

// Public product URL shown in the search preview.
const SITE_URL = 'https://www.trakwaytechnologies.com';

// SEO tab (PUT /:id/seo): meta title / keywords / description, canonical URL, hide-from-search,
// and Google tag scripts. Empty fields fall back to the product name / short description on the website.
@Component({
  selector: 'app-product-seo',
  imports: [ReactiveFormsModule],
  templateUrl: './seo.html',
})
export class SeoTab implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);

  readonly product = input.required<ProductDetails>();
  readonly saved = output<ProductDetails>();
  readonly dirtyChange = output<boolean>();

  protected readonly limits = SEO_LIMITS;
  protected readonly siteUrl = SITE_URL;

  protected readonly form = this.fb.nonNullable.group({
    seo_title: ['', Validators.maxLength(SEO_LIMITS.titleMax)],
    seo_keywords: ['', Validators.maxLength(SEO_LIMITS.keywordsMax)],
    seo_description: ['', Validators.maxLength(SEO_LIMITS.descriptionMax)],
    seo_canonical_url: ['', [Validators.maxLength(SEO_LIMITS.canonicalMax), Validators.pattern(/^\s*(https?:\/\/\S+)?\s*$/i)]],
    seo_noindex: [false],
    seo_scripts: ['', Validators.maxLength(SEO_LIMITS.scriptsMax)],
  });

  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly dirty = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  // What Google would show: the SEO value, or the product's own name / short description.
  protected readonly preview = computed(() => {
    const v = this.value();
    const p = this.product();
    return {
      title: v.seo_title?.trim() || p.name,
      description: v.seo_description?.trim() || p.short_description || '',
      url: `${SITE_URL} › en › product › ${p.slug}`,
    };
  });
  protected readonly titleLength = computed(() => (this.value().seo_title ?? '').trim().length);
  protected readonly descriptionLength = computed(() => (this.value().seo_description ?? '').trim().length);

  constructor() {
    effect(() => this.dirtyChange.emit(this.dirty()));
  }

  ngOnInit(): void {
    this.fill(this.product());
    this.form.valueChanges.subscribe(() => this.dirty.set(this.form.dirty));
  }

  protected fieldError(field: Field): string | null {
    const control = this.form.controls[field];
    if (!control.touched && !control.hasError('server')) return null;
    if (field === 'seo_canonical_url' && control.hasError('pattern')) return 'Canonical URL must start with https://';
    return controlError(control, LABELS[field]);
  }

  protected inputClass(field: Field): string {
    return this.fieldError(field)
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
      : 'border-gray-300 focus:border-brand-600 focus:ring-brand-600/15';
  }

  // Counter colour: grey while within Google's display length, amber when it will be cut off.
  protected counterClass(length: number, ideal: number): string {
    return length > ideal ? 'text-amber-600' : 'text-gray-400';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: ProductSeoPayload = {
      seo_title: v.seo_title.trim() || null,
      seo_keywords: v.seo_keywords.trim() || null,
      seo_description: v.seo_description.trim() || null,
      seo_canonical_url: v.seo_canonical_url.trim() || null,
      seo_noindex: v.seo_noindex,
      seo_scripts: v.seo_scripts.trim() || null,
    };

    this.saving.set(true);
    this.error.set(null);
    this.productService.updateSeo(this.product().id, payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.fill(res.data);
        this.saved.emit(res.data);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(err, 'Could not save SEO'));
        applyServerErrors(this.form, getFieldErrors(err));
      },
    });
  }

  private fill(p: ProductDetails): void {
    this.form.reset({
      seo_title: p.seo_title ?? '',
      seo_keywords: p.seo_keywords ?? '',
      seo_description: p.seo_description ?? '',
      seo_canonical_url: p.seo_canonical_url ?? '',
      seo_noindex: !!p.seo_noindex,
      seo_scripts: p.seo_scripts ?? '',
    });
    this.dirty.set(false);
  }
}
