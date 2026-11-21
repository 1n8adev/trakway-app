import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { Vendor, VendorFilters, VendorPayload } from '../models/vendor.model';

// /api/admin/vendors
@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/vendors`;

  list(filters: VendorFilters = {}): Observable<PaginatedResponse<Vendor>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<Vendor>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Vendor> {
    return this.http.get<ApiResponse<Vendor>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  create(payload: VendorPayload): Observable<ApiResponse<Vendor>> {
    return this.http.post<ApiResponse<Vendor>>(this.baseUrl, payload);
  }

  // Send only what changed.
  update(id: number, payload: VendorPayload): Observable<ApiResponse<Vendor>> {
    return this.http.put<ApiResponse<Vendor>>(`${this.baseUrl}/${id}`, payload);
  }

  setStatus(id: number, isActive: boolean): Observable<ApiResponse<Vendor>> {
    return this.http.patch<ApiResponse<Vendor>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }

  // 409 if the vendor has invoices.
  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
