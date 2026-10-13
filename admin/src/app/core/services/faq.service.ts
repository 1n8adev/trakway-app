import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { Faq, FaqFilters, FaqPayload } from '../models/faq.model';

// /api/admin/faqs
@Injectable({ providedIn: 'root' })
export class FaqService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/faqs`;

  list(filters: FaqFilters = {}): Observable<PaginatedResponse<Faq>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<Faq>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Faq> {
    return this.http.get<ApiResponse<Faq>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  // New FAQs are added at the end of the list.
  create(payload: FaqPayload): Observable<ApiResponse<Faq>> {
    return this.http.post<ApiResponse<Faq>>(this.baseUrl, payload);
  }

  update(id: number, payload: FaqPayload): Observable<ApiResponse<Faq>> {
    return this.http.put<ApiResponse<Faq>>(`${this.baseUrl}/${id}`, payload);
  }

  setStatus(id: number, isActive: boolean): Observable<ApiResponse<Faq>> {
    return this.http.patch<ApiResponse<Faq>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }

  // ids in the new display order; the API sets sort_order 0, 1, 2… for exactly these ids.
  reorder(ids: number[]): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${this.baseUrl}/reorder`, { ids });
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
