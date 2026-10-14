import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { ClientLogo, ClientLogoFilters, ClientLogoPayload } from '../models/client-logo.model';
import { toFormData } from '../utils/form-data';

@Injectable({ providedIn: 'root' })
export class ClientLogoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/client-logos`;

  list(filters: ClientLogoFilters = {}): Observable<PaginatedResponse<ClientLogo>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<ClientLogo>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ClientLogo> {
    return this.http.get<ApiResponse<ClientLogo>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  // The logo file is required when creating.
  create(payload: ClientLogoPayload, image: File): Observable<ApiResponse<ClientLogo>> {
    return this.http.post<ApiResponse<ClientLogo>>(this.baseUrl, toFormData(payload, { image }));
  }

  // Sends multipart when a new logo file is attached (it replaces the old one), JSON otherwise.
  update(id: number, payload: Partial<ClientLogoPayload>, image?: File | null): Observable<ApiResponse<ClientLogo>> {
    const body = image ? toFormData(payload, { image }) : payload;
    return this.http.put<ApiResponse<ClientLogo>>(`${this.baseUrl}/${id}`, body);
  }

  setStatus(id: number, isActive: boolean): Observable<ApiResponse<ClientLogo>> {
    return this.http.patch<ApiResponse<ClientLogo>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
