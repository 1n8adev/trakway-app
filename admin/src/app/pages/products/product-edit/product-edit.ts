import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, map, of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ProductDetails } from '../../../core/models/product.model';
import { ProductService } from '../../../core/services/product.service';
import { ToastService } from '../../../core/services/toast.service';
import { getErrorMessage } from '../../../core/utils/http-error';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog';
import { BasicInfoTab } from './tabs/basic-info/basic-info';
import { BenefitsTab } from './tabs/benefits/benefits';
import { SpecificationsTab } from './tabs/specifications/specifications';
import { HtmlContentTab } from './tabs/html-content/html-content';
import { CombinationsTab } from './tabs/combinations/combinations';

type TabKey = 'basic' | 'benefits' | 'specifications' | 'package' | 'box' | 'combinations';

interface TabDef {
  key: TabKey;
  label: string;
  // Count/summary badge for an existing product.
  badge?: (p: ProductDetails) => number;
}

// Add / edit product. /products/new shows only Basic Information; once it is created the URL
// becomes /products/:id/edit and the other tabs unlock. Each tab saves on its own.
@Component({
  selector: 'app-product-edit',
  imports: [RouterLink, BasicInfoTab, BenefitsTab, SpecificationsTab, HtmlContentTab, CombinationsTab],
  templateUrl: './product-edit.html',
})
export class ProductEdit implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly location = inject(Location);

  // Route param (withComponentInputBinding). Absent on /products/new.
  readonly id = input<string>();

  protected readonly tabs: TabDef[] = [
    { key: 'basic', label: 'Basic Information', badge: (p) => p.images.length },
    { key: 'benefits', label: 'Benefits', badge: (p) => p.benefits.length },
    { key: 'specifications', label: 'Specifications', badge: (p) => p.specifications?.length ?? 0 },
    { key: 'package', label: 'Packages & Details' },
    { key: 'box', label: "What's in the Box" },
    { key: 'combinations', label: 'Combinations', badge: (p) => p.variants?.length ?? 0 },
  ];

  protected readonly product = signal<ProductDetails | null>(null);
  protected readonly activeTab = signal<TabKey>('basic');
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly statusBusy = signal(false);
  // Set by the active tab; used to warn before switching tabs or leaving.
  protected readonly dirty = signal(false);

  protected readonly isNew = computed(() => !this.product());

  ngOnInit(): void {
    const id = Number(this.id());
    if (this.id() && Number.isInteger(id) && id > 0) this.load(id);
    else if (this.id()) this.loadError.set('Invalid product id');
  }

  protected load(id: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.productService.getById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(getErrorMessage(err, 'Could not load the product'));
      },
    });
  }

  protected isLocked(tab: TabDef): boolean {
    return tab.key !== 'basic' && !this.product();
  }

  protected selectTab(tab: TabDef): void {
    if (this.isLocked(tab) || tab.key === this.activeTab()) return;
    this.confirmDiscard().subscribe((ok) => {
      if (!ok) return;
      this.dirty.set(false);
      this.activeTab.set(tab.key);
    });
  }

  protected onSaved(product: ProductDetails): void {
    const wasNew = !this.product();
    this.product.set(product);
    this.dirty.set(false);
    if (wasNew) {
      // Switch the address to the edit URL without re-creating this page.
      this.location.replaceState(`/products/${product.id}/edit`);
      this.toast.success(`"${product.name}" created. You can now fill in the other tabs.`);
      this.activeTab.set('benefits');
    } else {
      this.toast.success('Changes saved');
    }
  }

  // PATCH /status returns the product row without images/benefits, so only merge the status.
  protected toggleStatus(): void {
    const product = this.product();
    if (!product) return;
    this.statusBusy.set(true);
    this.productService.setStatus(product.id, !product.is_active).subscribe({
      next: (res) => {
        this.statusBusy.set(false);
        this.product.update((p) => (p ? { ...p, is_active: res.data.is_active, updated_at: res.data.updated_at } : p));
        this.toast.success(res.message);
      },
      error: (err) => {
        this.statusBusy.set(false);
        this.toast.error(getErrorMessage(err, 'Could not change status'));
      },
    });
  }

  // Used by the route's canDeactivate guard too.
  confirmDiscard(): Observable<boolean> {
    if (!this.dirty()) return of(true);
    return this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Discard unsaved changes?',
          message: 'You have changes on this tab that are not saved yet.',
          confirmText: 'Discard',
          danger: true,
        },
        width: '420px',
        autoFocus: false,
      })
      .afterClosed()
      .pipe(map((ok) => !!ok));
  }
}
