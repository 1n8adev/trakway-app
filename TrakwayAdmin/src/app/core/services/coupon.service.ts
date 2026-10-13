import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { Coupon, CouponFilters, CouponPayload } from '../models/coupon.model';

// /api/admin/coupons
@Injectable({ providedIn: 'root' })
export class CouponService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/coupons`;

  list(filters: CouponFilters = {}): Observable<PaginatedResponse<Coupon>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<Coupon>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Coupon> {
    return this.http.get<ApiResponse<Coupon>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  create(payload: CouponPayload): Observable<ApiResponse<Coupon>> {
    return this.http.post<ApiResponse<Coupon>>(this.baseUrl, payload);
  }

  // Send only what changed.
  update(id: number, payload: CouponPayload): Observable<ApiResponse<Coupon>> {
    return this.http.put<ApiResponse<Coupon>>(`${this.baseUrl}/${id}`, payload);
  }

  setStatus(id: number, isActive: boolean): Observable<ApiResponse<Coupon>> {
    return this.http.patch<ApiResponse<Coupon>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }

  // 409 when the coupon has been used in an order — deactivate it instead.
  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
