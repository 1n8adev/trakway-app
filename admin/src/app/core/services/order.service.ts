import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { Order, OrderFilters, OrderStatusPayload, OrderSummary } from '../models/order.model';

// /api/admin/orders
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/orders`;

  list(filters: OrderFilters = {}): Observable<PaginatedResponse<Order>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<Order>>(this.baseUrl, { params });
  }

  summary(): Observable<OrderSummary> {
    return this.http.get<ApiResponse<OrderSummary>>(`${this.baseUrl}/summary`).pipe(map((res) => res.data));
  }

  // Includes items.
  getById(id: number): Observable<Order> {
    return this.http.get<ApiResponse<Order>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  // PDF tax invoice. The full response is returned so the file name can be read from Content-Disposition.
  invoice(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/${id}/invoice`, { responseType: 'blob', observe: 'response' });
  }

  // Only to one of the order's next_statuses. 409 if another admin changed it first.
  setStatus(id: number, payload: OrderStatusPayload): Observable<ApiResponse<Order>> {
    return this.http.patch<ApiResponse<Order>>(`${this.baseUrl}/${id}/status`, payload);
  }

  // null / "" clears the notes.
  updateNotes(id: number, adminNotes: string | null): Observable<ApiResponse<Order>> {
    return this.http.patch<ApiResponse<Order>>(`${this.baseUrl}/${id}`, { admin_notes: adminNotes });
  }
}
