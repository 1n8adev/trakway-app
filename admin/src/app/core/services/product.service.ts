import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import {
  BenefitPayload,
  ProductBasicPayload,
  ProductDetails,
  ProductFilters,
  ProductListItem,
  ProductSpecification,
  ProductVariantsResponse,
  VariantPayload,
} from '../models/product.model';

// /api/admin/products. One save endpoint per admin tab; each returns the full product.
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/products`;

  list(filters: ProductFilters = {}): Observable<PaginatedResponse<ProductListItem>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<ProductListItem>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ProductDetails> {
    return this.http.get<ApiResponse<ProductDetails>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  // Tab 1 (create). The API requires at least 2 images, sent as files under "images".
  create(payload: ProductBasicPayload, images: File[]): Observable<ApiResponse<ProductDetails>> {
    return this.http.post<ApiResponse<ProductDetails>>(this.baseUrl, this.basicForm(payload, images));
  }

  // Tab 1 (update). New images are appended; remove_image_ids deletes existing ones.
  updateBasic(id: number, payload: ProductBasicPayload, images: File[]): Observable<ApiResponse<ProductDetails>> {
    const body = images.length ? this.basicForm(payload, images) : payload;
    return this.http.put<ApiResponse<ProductDetails>>(`${this.baseUrl}/${id}/basic`, body);
  }

  // Tab 2. Replaces the whole list. files[i] (if any) becomes benefit i's new image.
  updateBenefits(id: number, benefits: BenefitPayload[], files: (File | null)[]): Observable<ApiResponse<ProductDetails>> {
    let body: FormData | { benefits: BenefitPayload[] } = { benefits };
    if (files.some(Boolean)) {
      const form = new FormData();
      form.append('benefits', JSON.stringify(benefits));
      files.forEach((file, i) => file && form.append(`benefits[${i}][image]`, file));
      body = form;
    }
    return this.http.put<ApiResponse<ProductDetails>>(`${this.baseUrl}/${id}/benefits`, body);
  }

  // Tab 3. Replaces the whole list.
  updateSpecifications(id: number, specifications: ProductSpecification[]): Observable<ApiResponse<ProductDetails>> {
    return this.http.put<ApiResponse<ProductDetails>>(`${this.baseUrl}/${id}/specifications`, { specifications });
  }

  // Tab 4. null clears it.
  updatePackageDetails(id: number, html: string | null): Observable<ApiResponse<ProductDetails>> {
    return this.http.put<ApiResponse<ProductDetails>>(`${this.baseUrl}/${id}/package-details`, { package_details: html });
  }

  // Tab 5. null clears it.
  updateBoxContents(id: number, html: string | null): Observable<ApiResponse<ProductDetails>> {
    return this.http.put<ApiResponse<ProductDetails>>(`${this.baseUrl}/${id}/box-contents`, { box_contents: html });
  }

  // Tab 6. Unlike the other tabs this returns { attributes, variants }, not the product.
  updateVariants(id: number, variants: VariantPayload[]): Observable<ApiResponse<ProductVariantsResponse>> {
    return this.http.put<ApiResponse<ProductVariantsResponse>>(`${this.baseUrl}/${id}/variants`, { variants });
  }

  setStatus(id: number, isActive: boolean): Observable<ApiResponse<ProductDetails>> {
    return this.http.patch<ApiResponse<ProductDetails>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }

  // Lists go as JSON strings (the API parses them); null becomes "" which the API reads as null.
  private basicForm(payload: ProductBasicPayload, images: File[]): FormData {
    const form = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) form.append(key, JSON.stringify(value));
      else form.append(key, value === null ? '' : String(value));
    }
    images.forEach((file) => form.append('images', file));
    return form;
  }
}
