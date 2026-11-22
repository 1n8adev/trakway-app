import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.model';
import { VendorInvoiceType, VendorInvoiceTypePayload } from '../models/vendor-invoice.model';

// /api/admin/vendor-invoice-types
@Injectable({ providedIn: 'root' })
export class VendorInvoiceTypeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/vendor-invoice-types`;

  // All types (active and inactive), with invoice_count.
  list(): Observable<VendorInvoiceType[]> {
    return this.http.get<ApiResponse<VendorInvoiceType[]>>(this.baseUrl).pipe(map((res) => res.data));
  }

  create(payload: VendorInvoiceTypePayload): Observable<ApiResponse<VendorInvoiceType>> {
    return this.http.post<ApiResponse<VendorInvoiceType>>(this.baseUrl, payload);
  }

  // 409 when changing the prefix of a type that has invoices.
  update(id: number, payload: VendorInvoiceTypePayload): Observable<ApiResponse<VendorInvoiceType>> {
    return this.http.put<ApiResponse<VendorInvoiceType>>(`${this.baseUrl}/${id}`, payload);
  }

  setStatus(id: number, isActive: boolean): Observable<ApiResponse<VendorInvoiceType>> {
    return this.http.patch<ApiResponse<VendorInvoiceType>>(`${this.baseUrl}/${id}/status`, { is_active: isActive });
  }

  // 409 when the type has invoices.
  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
