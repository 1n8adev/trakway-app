import { Component, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../../../../core/models/api.model';
import { ProductDetails } from '../../../../../core/models/product.model';
import { ProductService } from '../../../../../core/services/product.service';
import { getErrorMessage, getFieldErrors } from '../../../../../core/utils/http-error';
import { RichEditor } from '../../../../../shared/rich-editor/rich-editor';

export type HtmlField = 'package_details' | 'box_contents';

const CONFIG: Record<HtmlField, { title: string; hint: string; placeholder: string; button: string }> = {
  package_details: {
    title: 'Packages & Details',
    hint: 'Subscription / recharge packages and other purchase details.',
    placeholder: 'e.g. 1 Year Recharge includes unlimited live tracking and alerts…',
    button: 'Save Packages & Details',
  },
  box_contents: {
    title: "What's in the Box",
    hint: 'Everything the customer receives in the package.',
    placeholder: 'e.g. GPS tracker, wiring harness, relay, user manual…',
    button: "Save What's in the Box",
  },
};

// Tabs 4 and 5: one rich-text field each (PUT /:id/package-details, PUT /:id/box-contents).
@Component({
  selector: 'app-product-html-content',
  imports: [FormsModule, RichEditor],
  template: `
    <div>
      <div class="mb-5">
        <h3 class="text-[16px] font-semibold text-gray-800">{{ config().title }}</h3>
        <p class="text-[14px] text-gray-500">{{ config().hint }}</p>
      </div>

      @if (error()) {
        <div class="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700" role="alert">{{ error() }}</div>
      }

      <app-rich-editor
        [(ngModel)]="html"
        (ngModelChange)="dirty.set(true); fieldError.set(null)"
        [label]="config().title"
        [placeholder]="config().placeholder"
        minHeight="260px"
        [invalid]="!!fieldError()"
      />
      @if (fieldError(); as msg) {
        <p class="mt-1.5 text-[13px] text-red-600">{{ msg }}</p>
      } @else {
        <p class="mt-1.5 text-[13px] text-gray-400">Leave empty and save to clear this section.</p>
      }

      <div class="mt-6 flex justify-end border-t border-gray-200 pt-5">
        <button
          type="button"
          (click)="submit()"
          [disabled]="saving()"
          class="flex h-[42px] items-center justify-center gap-2 rounded-md bg-gradient-to-r from-brand-600 to-brand-500 px-6 text-[15px] font-medium text-white shadow-[0_2px_6px_rgba(231,95,0,0.35)] transition hover:brightness-105 focus-visible:ring-4 focus-visible:ring-brand-600/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
        >
          @if (saving()) {
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.3" stroke-width="3" />
              <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            Saving…
          } @else {
            {{ config().button }}
          }
        </button>
      </div>
    </div>
  `,
})
export class HtmlContentTab implements OnInit {
  private readonly productService = inject(ProductService);

  readonly product = input.required<ProductDetails>();
  readonly field = input.required<HtmlField>();
  readonly saved = output<ProductDetails>();
  readonly dirtyChange = output<boolean>();

  protected html: string | null = null;
  protected readonly dirty = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly fieldError = signal<string | null>(null);

  protected config(): (typeof CONFIG)[HtmlField] {
    return CONFIG[this.field()];
  }

  constructor() {
    effect(() => this.dirtyChange.emit(this.dirty()));
  }

  ngOnInit(): void {
    this.html = this.product()[this.field()];
  }

  protected submit(): void {
    const id = this.product().id;
    const request: Observable<ApiResponse<ProductDetails>> =
      this.field() === 'package_details'
        ? this.productService.updatePackageDetails(id, this.html)
        : this.productService.updateBoxContents(id, this.html);

    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: (res) => {
        this.saving.set(false);
        // The API cleans the HTML; show what was actually stored.
        this.html = res.data[this.field()];
        this.dirty.set(false);
        this.saved.emit(res.data);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(err, 'Could not save'));
        this.fieldError.set(getFieldErrors(err)[this.field()] ?? null);
      },
    });
  }
}
