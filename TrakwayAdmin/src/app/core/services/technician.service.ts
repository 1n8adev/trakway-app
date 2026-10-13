import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { Technician, TechnicianFilters, TechnicianPayload, TechnicianPhotos } from '../models/technician.model';
import { toFormData } from '../utils/form-data';

// /api/admin/technicians
@Injectable({ providedIn: 'root' })
export class TechnicianService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/technicians`;

  list(filters: TechnicianFilters = {}): Observable<PaginatedResponse<Technician>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<Technician>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Technician> {
    return this.http.get<ApiResponse<Technician>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  // All text fields plus the three photos are required.
  create(payload: TechnicianPayload, photos: TechnicianPhotos): Observable<ApiResponse<Technician>> {
    return this.http.post<ApiResponse<Technician>>(this.baseUrl, toFormData(payload, photos));
  }

  // Send only what changed; an uploaded photo replaces the old one.
  update(id: number, payload: TechnicianPayload, photos: TechnicianPhotos = {}): Observable<ApiResponse<Technician>> {
    return this.http.put<ApiResponse<Technician>>(`${this.baseUrl}/${id}`, toFormData(payload, photos));
  }

  setStatus(id: number, isActive: boolean): Observable<ApiResponse<Technician>> {
    return this.http.patch<ApiResponse<Technician>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }

  // The ID proof is private, so a plain <img src> can't load it; fetch it with the token as a blob.
  idProof(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/id-proof`, { responseType: 'blob' });
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
