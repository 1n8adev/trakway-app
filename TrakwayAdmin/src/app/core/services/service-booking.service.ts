import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import {
  BookingFilters,
  BookingOptions,
  BookingStatus,
  BookingSummary,
  BookingUpdatePayload,
  ServiceBooking,
  TechnicianChoice,
} from '../models/service-booking.model';

// /api/admin/service-bookings
@Injectable({ providedIn: 'root' })
export class ServiceBookingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/service-bookings`;

  // The options are constants on the API, so one request per session is enough.
  private options$?: Observable<BookingOptions>;

  // Newest first.
  list(filters: BookingFilters = {}): Observable<PaginatedResponse<ServiceBooking>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<ServiceBooking>>(this.baseUrl, { params });
  }

  summary(): Observable<BookingSummary> {
    return this.http.get<ApiResponse<BookingSummary>>(`${this.baseUrl}/summary`).pipe(map((res) => res.data));
  }

  options(): Observable<BookingOptions> {
    this.options$ ??= this.http.get<ApiResponse<BookingOptions>>(`${this.baseUrl}/options`).pipe(
      map((res) => res.data),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.options$;
  }

  getById(id: number): Observable<ServiceBooking> {
    return this.http.get<ApiResponse<ServiceBooking>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  // Active technicians for this booking, nearest to the customer first.
  technicianChoices(id: number, limit = 100): Observable<TechnicianChoice[]> {
    return this.http
      .get<ApiResponse<TechnicianChoice[]>>(`${this.baseUrl}/${id}/technicians`, { params: { limit } })
      .pipe(map((res) => res.data));
  }

  // The API sets assigned_at / completed_at to follow the status.
  setStatus(id: number, status: BookingStatus, extra: Omit<BookingUpdatePayload, 'status'> = {}): Observable<ApiResponse<ServiceBooking>> {
    return this.http.patch<ApiResponse<ServiceBooking>>(`${this.baseUrl}/${id}/status`, { status, ...extra });
  }

  // Any of status / technician_id / admin_notes in one call.
  update(id: number, payload: BookingUpdatePayload): Observable<ApiResponse<ServiceBooking>> {
    return this.http.patch<ApiResponse<ServiceBooking>>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
