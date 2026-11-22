import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { MappableSupplierProduct, ProductAccessory, ProductAccessoryFilters, ProductAccessoryPayload } from '../models/product-accessory.model';

// /api/admin/product-accessories
@Injectable({ providedIn: 'root' })
export class ProductAccessoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/product-accessories`;

  supplierProducts(): Observable<MappableSupplierProduct[]> {
    return this.http.get<ApiResponse<MappableSupplierProduct[]>>(`${this.baseUrl}/supplier-products`).pipe(map((res) => res.data));
  }

  list(filters: ProductAccessoryFilters = {}): Observable<PaginatedResponse<ProductAccessory>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<ProductAccessory>>(this.baseUrl, { params });
  }

  create(payload: ProductAccessoryPayload): Observable<ApiResponse<ProductAccessory>> {
    return this.http.post<ApiResponse<ProductAccessory>>(this.baseUrl, payload);
  }

  update(id: number, payload: ProductAccessoryPayload): Observable<ApiResponse<ProductAccessory>> {
    return this.http.put<ApiResponse<ProductAccessory>>(`${this.baseUrl}/${id}`, payload);
  }

  setStatus(id: number, isActive: boolean): Observable<ApiResponse<ProductAccessory>> {
    return this.http.patch<ApiResponse<ProductAccessory>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }

  // 409 when the accessory is on any invoice.
  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
