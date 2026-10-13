import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { UserFilters, UserSummary, WebsiteUser, WebsiteUserDetail } from '../models/user.model';

// /api/admin/users — website customers.
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/users`;

  list(filters: UserFilters = {}): Observable<PaginatedResponse<WebsiteUser>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<WebsiteUser>>(this.baseUrl, { params });
  }

  summary(): Observable<UserSummary> {
    return this.http.get<ApiResponse<UserSummary>>(`${this.baseUrl}/summary`).pipe(map((res) => res.data));
  }

  // Profile, sessions, order stats, cart, saved addresses and every order with its items.
  getById(id: number): Observable<WebsiteUserDetail> {
    return this.http.get<ApiResponse<WebsiteUserDetail>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  // Blocking also logs the customer out of every device. Returns the same shape as getById.
  setStatus(id: number, isActive: boolean): Observable<ApiResponse<WebsiteUserDetail>> {
    return this.http.patch<ApiResponse<WebsiteUserDetail>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }
}
