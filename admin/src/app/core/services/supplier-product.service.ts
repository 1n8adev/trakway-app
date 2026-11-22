import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { SupplierProduct, SupplierProductFilters, SupplierProductPayload } from '../models/supplier-product.model';

// /api/admin/supplier-products
@Injectable({ providedIn: 'root' })
export class SupplierProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/supplier-products`;

  list(filters: SupplierProductFilters = {}): Observable<PaginatedResponse<SupplierProduct>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<SupplierProduct>>(this.baseUrl, { params });
  }

  create(payload: SupplierProductPayload): Observable<ApiResponse<SupplierProduct>> {
    return this.http.post<ApiResponse<SupplierProduct>>(this.baseUrl, payload);
  }

  update(id: number, payload: SupplierProductPayload): Observable<ApiResponse<SupplierProduct>> {
    return this.http.put<ApiResponse<SupplierProduct>>(`${this.baseUrl}/${id}`, payload);
  }

  setStatus(id: number, isActive: boolean): Observable<ApiResponse<SupplierProduct>> {
    return this.http.patch<ApiResponse<SupplierProduct>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
