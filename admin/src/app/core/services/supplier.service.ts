import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { Supplier, SupplierFilters, SupplierPayload } from '../models/supplier.model';

// /api/admin/suppliers
@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/suppliers`;

  list(filters: SupplierFilters = {}): Observable<PaginatedResponse<Supplier>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<Supplier>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Supplier> {
    return this.http.get<ApiResponse<Supplier>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  create(payload: SupplierPayload): Observable<ApiResponse<Supplier>> {
    return this.http.post<ApiResponse<Supplier>>(this.baseUrl, payload);
  }

  // Send only what changed.
  update(id: number, payload: SupplierPayload): Observable<ApiResponse<Supplier>> {
    return this.http.put<ApiResponse<Supplier>>(`${this.baseUrl}/${id}`, payload);
  }

  setStatus(id: number, isActive: boolean): Observable<ApiResponse<Supplier>> {
    return this.http.patch<ApiResponse<Supplier>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
