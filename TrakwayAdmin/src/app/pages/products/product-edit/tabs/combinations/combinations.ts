import { Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Attribute } from '../../../../../core/models/attribute.model';
import { OfferType, PRODUCT_LIMITS, ProductDetails, VariantPayload } from '../../../../../core/models/product.model';
import { AttributeService } from '../../../../../core/services/attribute.service';
import { ProductService } from '../../../../../core/services/product.service';
import { getErrorMessage, getFieldErrors } from '../../../../../core/utils/http-error';
import { FIELD_BASE, fieldState } from '../../../../../core/utils/ui';
import { PricePreview, previewPrice, pricingErrors, rupees } from '../../../../../core/utils/pricing';

interface VariantRow {
  key: number;
  id?: number;
  // attribute id -> chosen attribute value id
  values: Record<number, number | null>;
  // ngModel on a number input gives a number, or null when empty.
  price: number | string | null;
  // '' = no offer
  offer_type: OfferType | '';
  offer_value: number | string | null;
  sku: string;
  is_active: boolean;
}



// Tab 6. PUT /products/:id/variants sends the whole list: rows with id are updated, rows without id
// are created, and saved combinations missing from the list are deleted.
@Component({
  selector: 'app-product-combinations',
  imports: [FormsModule, RouterLink],
  templateUrl: './combinations.html',
})
export class CombinationsTab implements OnInit {
  private readonly attributeService = inject(AttributeService);
  private readonly productService = inject(ProductService);

  readonly product = input.required<ProductDetails>();
  readonly saved = output<ProductDetails>();
  readonly dirtyChange = output<boolean>();

  protected readonly limits = PRODUCT_LIMITS;
  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly fieldState = fieldState;
  protected readonly rupees = rupees;

  protected readonly attributes = signal<Attribute[]>([]);
  protected readonly attributesLoading = signal(true);
  protected readonly attributesError = signal<string | null>(null);

  // Attributes this product's combinations use, in attribute sort order.
  protected readonly selectedIds = signal<number[]>([]);
  protected readonly rows = signal<VariantRow[]>([]);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly dirty = signal(false);
  private nextKey = 1;

  protected readonly selectedAttributes = computed(() => {
    const ids = new Set(this.selectedIds());
    return this.attributes().filter((a) => ids.has(a.id));
  });

  // How many combinations "Generate all" would add.
  protected readonly missingCount = computed(() => this.missingCombinations().length);

  constructor() {
    effect(() => this.dirtyChange.emit(this.dirty()));
  }

  ngOnInit(): void {
    this.attributeService.list().subscribe({
      next: (list) => {
        this.attributes.set(list);
        this.attributesLoading.set(false);
        this.reset(this.product());
      },
      error: (err) => {
        this.attributesLoading.set(false);
        this.attributesError.set(getErrorMessage(err, 'Could not load attributes'));
      },
    });
  }

  protected touch(): void {
    this.dirty.set(true);
  }

  protected isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  // Adding an attribute gives every row an empty pick for it; removing drops that column.
  protected toggleAttribute(attr: Attribute): void {
    const selected = this.isSelected(attr.id);
    const ids = selected ? this.selectedIds().filter((id) => id !== attr.id) : [...this.selectedIds(), attr.id];
    const order = new Map(this.attributes().map((a, i) => [a.id, i]));
    this.selectedIds.set(ids.sort((a, b) => order.get(a)! - order.get(b)!));
    this.rows.update((list) =>
      list.map((row) => {
        const values = { ...row.values };
        if (selected) delete values[attr.id];
        else values[attr.id] = null;
        return { ...row, values };
      }),
    );
    this.errors.set({});
    this.touch();
  }

  protected addRow(): void {
    if (this.rows().length >= PRODUCT_LIMITS.maxVariants) return;
    this.rows.update((list) => [...list, this.blankRow()]);
    this.touch();
  }

  // Adds every combination of the selected attributes' active values that isn't in the table yet.
  protected generateAll(): void {
    const all = this.missingCombinations();
    const room = Math.max(0, PRODUCT_LIMITS.maxVariants - this.rows().length);
    const toAdd = all.slice(0, room);
    if (!toAdd.length) return;
    this.rows.update((list) => [...list, ...toAdd.map((values) => ({ ...this.blankRow(), values }))]);
    if (toAdd.length < all.length) {
      this.error.set(`Only ${PRODUCT_LIMITS.maxVariants} combinations are allowed; ${all.length - toAdd.length} were not added.`);
    }
    this.touch();
  }

  protected removeRow(index: number): void {
    this.rows.update((list) => list.filter((_, i) => i !== index));
    this.errors.set({});
    this.touch();
  }

  protected setValue(index: number, attributeId: number, valueId: number | null): void {
    this.rows.update((list) =>
      list.map((row, i) => (i === index ? { ...row, values: { ...row.values, [attributeId]: valueId } } : row)),
    );
    this.clearError(`variants[${index}].values`);
    this.touch();
  }

  // Live preview of the selling price, same formula as the API's pricing(). null when price/offer is incomplete.
  // Live preview of the selling price (same formula as the API). null while price/offer is incomplete.
  protected pricing(row: VariantRow): PricePreview | null {
    return previewPrice(row.price, row.offer_type, row.offer_value);
  }

  protected onOfferTypeChange(index: number, type: OfferType | ''): void {
    this.rows.update((list) =>
      list.map((row, i) => (i === index ? { ...row, offer_type: type, offer_value: type ? row.offer_value : null } : row)),
    );
    this.clearError(`variants[${index}].offer_type`);
    this.clearError(`variants[${index}].offer_value`);
    this.touch();
  }

  protected rowError(index: number, field: 'values' | 'price' | 'sku' | 'offer_type' | 'offer_value'): string | null {
    return this.errors()[`variants[${index}].${field}`] ?? null;
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
    const errors = this.validate();
    this.errors.set(errors);
    if (Object.keys(errors).length) {
      this.error.set('Please fix the highlighted combinations.');
      return;
    }

    const attrIds = this.selectedIds();
    const payload: VariantPayload[] = this.rows().map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      values: attrIds.map((id) => row.values[id]!),
      price: Number(row.price),
      offer_type: row.offer_type || null,
      offer_value: row.offer_type ? Number(row.offer_value) : null,
      sku: row.sku.trim() || null,
      is_active: row.is_active,
    }));

    this.saving.set(true);
    this.error.set(null);
    this.productService.updateVariants(this.product().id, payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        const product = {
          ...this.product(),
          attributes: res.data.attributes,
          variants: res.data.variants,
          has_variants: res.data.variants.length > 0,
        };
        this.reset(product);
        this.saved.emit(product);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(getErrorMessage(err, 'Could not save combinations'));
        const fieldErrors = getFieldErrors(err);
        // A duplicate SKU comes back as { sku }, without a row index.
        if (fieldErrors['sku'] && !Object.keys(fieldErrors).some((k) => k.endsWith('.sku'))) {
          this.error.set(fieldErrors['sku']);
        }
        this.errors.set(fieldErrors);
      },
    });
  }

  private validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    const attrIds = this.selectedIds();
    if (this.rows().length && !attrIds.length) {
      this.error.set('Choose at least one attribute for the combinations.');
      errors['attributes'] = 'Choose at least one attribute';
      return errors;
    }
    const seen = new Map<string, number>();
    this.rows().forEach((row, i) => {
      const key = `variants[${i}]`;
      const picked = attrIds.map((id) => row.values[id]);
      if (picked.some((v) => v === null || v === undefined)) {
        errors[`${key}.values`] = 'Pick a value for every attribute';
      } else {
        const combo = [...(picked as number[])].sort((a, b) => a - b).join('-');
        if (seen.has(combo)) errors[`${key}.values`] = `Same combination as row ${seen.get(combo)! + 1}`;
        else seen.set(combo, i);
      }
      const priceErrors = pricingErrors(row.price, row.offer_type, row.offer_value, { priceRequired: true });
      if (priceErrors.price) errors[`${key}.price`] = priceErrors.price;
      if (priceErrors.offer_value) errors[`${key}.offer_value`] = priceErrors.offer_value;
      if (row.sku.trim().length > 100) errors[`${key}.sku`] = 'At most 100 characters';
    });
    return errors;
  }

  private missingCombinations(): Record<number, number>[] {
    const attrs = this.selectedAttributes();
    if (!attrs.length) return [];
    let combos: Record<number, number>[] = [{}];
    for (const attr of attrs) {
      const values = attr.values.filter((v) => v.is_active);
      combos = combos.flatMap((combo) => values.map((v) => ({ ...combo, [attr.id]: v.id })));
    }
    const existing = new Set(
      this.rows().map((row) => attrs.map((a) => row.values[a.id] ?? 'x').join('-')),
    );
    return combos.filter((combo) => !existing.has(attrs.map((a) => combo[a.id]).join('-')));
  }

  private blankRow(): VariantRow {
    const values: Record<number, number | null> = {};
    for (const id of this.selectedIds()) values[id] = null;
    return { key: this.nextKey++, values, price: null, offer_type: '', offer_value: null, sku: '', is_active: true };
  }

  private reset(product: ProductDetails): void {
    const variants = product.variants ?? [];
    const used = new Set(variants.flatMap((v) => v.values.map((x) => x.attribute_id)));
    const order = new Map(this.attributes().map((a, i) => [a.id, i]));
    this.selectedIds.set([...used].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)));
    this.rows.set(
      variants.map((v) => ({
        key: this.nextKey++,
        id: v.id,
        values: Object.fromEntries(v.values.map((x) => [x.attribute_id, x.value_id])),
        price: v.price,
        offer_type: v.offer_type ?? '',
        offer_value: v.offer_value,
        sku: v.sku ?? '',
        is_active: v.is_active,
      })),
    );
    this.errors.set({});
    this.error.set(null);
    this.dirty.set(false);
  }
}
