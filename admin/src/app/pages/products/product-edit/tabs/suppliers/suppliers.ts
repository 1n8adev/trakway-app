import { Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductDetails } from '../../../../../core/models/product.model';
import { ProductSuppliers, mappedToLabel } from '../../../../../core/models/product-accessory.model';
import { ProductService } from '../../../../../core/services/product.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { getErrorMessage, getFieldErrors } from '../../../../../core/utils/http-error';
import { rupees } from '../../../../../core/utils/pricing';

type SupplierProductRow = ProductSuppliers['supplier_products'][number];

// Suppliers tab (GET/PUT /:id/suppliers): which supplier products are this product. Purchases of them will
// count as its stock. Stock is per product — combinations (e.g. 1 Year / 2 Years) all use the same stock.
// A supplier product is one Trakway item, so ones mapped to another product / an accessory can't be added here.
@Component({
  selector: 'app-product-suppliers',
  imports: [RouterLink],
  templateUrl: './suppliers.html',
})
export class SuppliersTab implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly toast = inject(ToastService);

  readonly product = input.required<ProductDetails>();
  readonly dirtyChange = output<boolean>();

  protected readonly rupees = rupees;
  protected readonly mappedToLabel = mappedToLabel;

  protected readonly data = signal<ProductSuppliers | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  // Mapped supplier product ids, in the order added.
  protected readonly ids = signal<number[]>([]);
  private initial = '';

  protected readonly dirty = computed(() => [...this.ids()].sort((a, b) => a - b).join(',') !== this.initial);

  private readonly byId = computed(() => new Map((this.data()?.supplier_products ?? []).map((sp) => [sp.id, sp])));

  protected readonly mapped = computed(() => this.ids().map((id) => this.byId().get(id)).filter((sp): sp is SupplierProductRow => !!sp));

  // Supplier products not on this tab, grouped by supplier for the "Add" list.
  protected readonly addGroups = computed(() => {
    const taken = new Set(this.ids());
    const groups = new Map<string, SupplierProductRow[]>();
    for (const sp of this.data()?.supplier_products ?? []) {
      if (taken.has(sp.id)) continue;
      const list = groups.get(sp.supplier_name) ?? [];
      list.push(sp);
      groups.set(sp.supplier_name, list);
    }
    return [...groups.entries()].map(([supplier, items]) => ({ supplier, items }));
  });

  constructor() {
    effect(() => this.dirtyChange.emit(this.dirty()));
  }

  ngOnInit(): void {
    this.productService.getSuppliers(this.product().id).subscribe({
      next: (data) => {
        this.apply(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(err, 'Could not load suppliers'));
      },
    });
  }

  private apply(data: ProductSuppliers): void {
    this.data.set(data);
    const mine = data.supplier_products.filter((sp) => sp.product_id === this.product().id).map((sp) => sp.id);
    this.ids.set(mine);
    this.initial = [...mine].sort((a, b) => a - b).join(',');
  }

  // Mapped to an accessory or another product: shown in the list but can't be picked.
  protected mappedElsewhere(sp: SupplierProductRow): boolean {
    return !!sp.accessory_id || (!!sp.product_id && sp.product_id !== this.product().id);
  }

  protected add(raw: string, select: HTMLSelectElement): void {
    const sp = this.byId().get(Number(raw));
    select.value = '';
    if (!sp || this.mappedElsewhere(sp)) return;
    this.ids.update((ids) => [...ids, sp.id]);
    this.error.set(null);
  }

  protected remove(id: number): void {
    this.ids.update((ids) => ids.filter((x) => x !== id));
    this.error.set(null);
  }

  protected discard(): void {
    const data = this.data();
    if (data) this.apply(data);
    this.error.set(null);
  }

  protected submit(): void {
    this.saving.set(true);
    this.error.set(null);
    this.productService.updateSuppliers(this.product().id, this.ids()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.apply(res.data);
        this.toast.success(res.message);
      },
      error: (err) => {
        this.saving.set(false);
        const fields = Object.values(getFieldErrors(err));
        this.error.set(fields.length ? fields.join('. ') : getErrorMessage(err, 'Could not save the supplier mapping'));
      },
    });
  }
}
