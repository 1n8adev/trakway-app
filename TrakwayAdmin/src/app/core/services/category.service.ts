import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { Category, CategoryFilters, CategoryOption, CategoryPayload } from '../models/category.model';
import { toFormData } from '../utils/form-data';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/categories`;

  list(filters: CategoryFilters = {}): Observable<PaginatedResponse<Category>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<Category>>(this.baseUrl, { params });
  }

  tree(): Observable<CategoryOption[]> {
    return this.http.get<ApiResponse<CategoryOption[]>>(`${this.baseUrl}/tree`).pipe(map((res) => res.data));
  }

  getById(id: number): Observable<Category> {
    return this.http.get<ApiResponse<Category>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  // Sends multipart when a new image file is attached, JSON otherwise.
  create(payload: CategoryPayload, image?: File | null): Observable<ApiResponse<Category>> {
    return this.http.post<ApiResponse<Category>>(this.baseUrl, this.body(payload, image));
  }

  update(id: number, payload: Partial<CategoryPayload>, image?: File | null): Observable<ApiResponse<Category>> {
    return this.http.put<ApiResponse<Category>>(`${this.baseUrl}/${id}`, this.body(payload, image));
  }

  setStatus(id: number, isActive: boolean): Observable<ApiResponse<Category>> {
    return this.http.patch<ApiResponse<Category>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }

  private body(payload: Partial<CategoryPayload>, image?: File | null): Partial<CategoryPayload> | FormData {
    if (!image) return payload;
    // The uploaded file replaces any existing image path.
    const { image: _existing, ...fields } = payload;
    return toFormData(fields, { image });
  }
}
