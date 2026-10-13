import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.model';
import {
  Attribute,
  AttributeCreatePayload,
  AttributeFilters,
  AttributeUpdatePayload,
  AttributeValuePayload,
} from '../models/attribute.model';

// /api/admin/attributes. Every value endpoint responds with the whole updated attribute.
@Injectable({ providedIn: 'root' })
export class AttributeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/attributes`;

  // Not paginated: returns every attribute with its values.
  list(filters: AttributeFilters = {}): Observable<Attribute[]> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<ApiResponse<Attribute[]>>(this.baseUrl, { params }).pipe(map((res) => res.data));
  }

  getById(id: number): Observable<Attribute> {
    return this.http.get<ApiResponse<Attribute>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  create(payload: AttributeCreatePayload): Observable<ApiResponse<Attribute>> {
    return this.http.post<ApiResponse<Attribute>>(this.baseUrl, payload);
  }

  update(id: number, payload: AttributeUpdatePayload): Observable<ApiResponse<Attribute>> {
    return this.http.put<ApiResponse<Attribute>>(`${this.baseUrl}/${id}`, payload);
  }

  setStatus(id: number, isActive: boolean): Observable<ApiResponse<Attribute>> {
    return this.http.patch<ApiResponse<Attribute>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }

  addValue(id: number, payload: AttributeValuePayload): Observable<ApiResponse<Attribute>> {
    return this.http.post<ApiResponse<Attribute>>(`${this.baseUrl}/${id}/values`, payload);
  }

  updateValue(id: number, valueId: number, payload: AttributeValuePayload): Observable<ApiResponse<Attribute>> {
    return this.http.put<ApiResponse<Attribute>>(`${this.baseUrl}/${id}/values/${valueId}`, payload);
  }

  setValueStatus(id: number, valueId: number, isActive: boolean): Observable<ApiResponse<Attribute>> {
    return this.http.patch<ApiResponse<Attribute>>(`${this.baseUrl}/${id}/values/${valueId}/status`, { is_active: isActive });
  }

  removeValue(id: number, valueId: number): Observable<ApiResponse<Attribute>> {
    return this.http.delete<ApiResponse<Attribute>>(`${this.baseUrl}/${id}/values/${valueId}`);
  }
}
