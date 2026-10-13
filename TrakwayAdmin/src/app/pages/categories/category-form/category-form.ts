import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Category, CategoryPayload } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';
import { FlatCategoryOption } from '../../../core/utils/category-tree';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { applyServerErrors, controlError } from '../../../core/utils/form-errors';
import { slugify } from '../../../core/utils/slugify';
import { assetUrl } from '../../../core/utils/asset-url';

export interface CategoryFormData {
  // null = add mode.
  category: Category | null;
  parentOptions: FlatCategoryOption[];
}

type Field = 'name' | 'slug' | 'parent_id' | 'description' | 'sort_order';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const LABELS: Record<Field, string> = {
  name: 'Title',
  slug: 'Slug',
  parent_id: 'Parent category',
  description: 'Description',
  sort_order: 'Sort order',
};

const notBlank = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

// Add/edit dialog for a category. Closes with the saved Category, or undefined when cancelled.
@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule],
  templateUrl: './category-form.html',
})
export class CategoryForm implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly dialogRef = inject<MatDialogRef<CategoryForm, Category>>(MatDialogRef);
  protected readonly data = inject<CategoryFormData>(MAT_DIALOG_DATA);

  // Same limits as the API's category.validation.js.
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(150)]],
    slug: ['', Validators.maxLength(180)],
    parent_id: [null as number | null],
    description: [''],
    sort_order: [0, [Validators.required, Validators.pattern(/^-?\d+$/)]],
    is_active: [true],
  });

  protected readonly isEdit = !!this.data.category;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly imageFile = signal<File | null>(null);
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly imageError = signal<string | null>(null);
  protected readonly dragging = signal(false);
  // File name shown in the "Choose File | No file chosen" box.
  protected readonly fileName = computed(() => {
    const file = this.imageFile();
    if (file) return file.name;
    const preview = this.imagePreview();
    return preview ? preview.split('/').pop() || 'Current image' : 'No file chosen';
  });
  private imageRemoved = false;
  private slugTouched = false;

  ngOnInit(): void {
    const category = this.data.category;
    if (category) {
      this.form.patchValue({
        name: category.name,
        slug: category.slug,
        parent_id: category.parent_id,
        description: category.description ?? '',
        sort_order: category.sort_order,
        is_active: category.is_active,
      });
      this.imagePreview.set(assetUrl(category.image));
      this.slugTouched = true;
    }

    // Auto-fill the slug from the name until the admin edits the slug directly.
    this.form.controls.name.valueChanges.subscribe((name) => {
      if (!this.slugTouched) this.form.controls.slug.setValue(slugify(name));
    });
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  protected fieldError(field: Field): string | null {
    const control = this.form.controls[field];
    return control.touched ? controlError(control, LABELS[field]) : null;
  }

  protected inputClass(field: Field): string {
    return this.fieldError(field)
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
      : 'border-gray-300 focus:border-brand-600 focus:ring-brand-600/15';
  }

  // Status is edited as a select ("active"/"inactive") but stored as the boolean is_active.
  protected onStatusChange(value: string): void {
    this.form.controls.is_active.setValue(value === 'active');
  }

  // Indents nested categories in the native <select>.
  protected indent(depth: number): string {
    return '    '.repeat(depth);
  }

  protected onSlugInput(): void {
    this.slugTouched = this.form.controls.slug.value.trim() !== '';
  }

  protected onImageSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (file) this.setImage(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setImage(file);
  }

  protected removeImage(): void {
    this.revokePreview();
    this.imageFile.set(null);
    this.imagePreview.set(null);
    this.imageError.set(null);
    this.imageRemoved = true;
  }

  protected close(): void {
    if (!this.saving()) this.dialogRef.close();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: CategoryPayload = {
      name: value.name.trim(),
      parent_id: value.parent_id,
      description: value.description.trim() || null,
      sort_order: Number(value.sort_order),
      is_active: value.is_active,
    };
    if (value.slug.trim()) payload.slug = value.slug.trim();
    if (this.imageRemoved && !this.imageFile()) payload.image = null;

    this.saving.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;

    const category = this.data.category;
    const request = category
      ? this.categoryService.update(category.id, payload, this.imageFile())
      : this.categoryService.create(payload, this.imageFile());

    request.subscribe({
      next: (res) => this.dialogRef.close(res.data),
      error: (err) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.error.set(getErrorMessage(err, 'Could not save category'));
        const fieldErrors = getFieldErrors(err);
        applyServerErrors(this.form, fieldErrors);
        if (fieldErrors['image']) this.imageError.set(fieldErrors['image']);
      },
    });
  }

  private setImage(file: File): void {
    if (!IMAGE_TYPES.includes(file.type)) {
      this.imageError.set('Image must be JPG, PNG, WEBP or GIF');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      this.imageError.set('Image must be 2 MB or smaller');
      return;
    }
    this.imageError.set(null);
    this.revokePreview();
    this.imageFile.set(file);
    this.imagePreview.set(URL.createObjectURL(file));
  }

  private revokePreview(): void {
    const preview = this.imagePreview();
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
  }
}
