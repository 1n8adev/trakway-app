import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import {
  PaymentPayload,
  VendorInvoice,
  VendorInvoiceFilters,
  VendorInvoiceListItem,
  VendorInvoiceOptions,
  VendorInvoicePayload,
  VendorInvoiceSummary,
} from '../models/vendor-invoice.model';

// /api/admin/vendor-invoices
@Injectable({ providedIn: 'root' })
export class VendorInvoiceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/vendor-invoices`;

  private params(filters: VendorInvoiceFilters): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return params;
  }

  list(filters: VendorInvoiceFilters = {}): Observable<PaginatedResponse<VendorInvoiceListItem>> {
    return this.http.get<PaginatedResponse<VendorInvoiceListItem>>(this.baseUrl, { params: this.params(filters) });
  }

  // Totals of issued invoices for the same filters (status is ignored).
  summary(filters: VendorInvoiceFilters = {}): Observable<VendorInvoiceSummary> {
    return this.http
      .get<ApiResponse<VendorInvoiceSummary>>(`${this.baseUrl}/summary`, { params: this.params(filters) })
      .pipe(map((res) => res.data));
  }

  // Active vendors + products, GST rates and defaults for the invoice form.
  // invoiceId (when editing) leaves that invoice's own lines out of the stock figures.
  options(invoiceId: number | null = null): Observable<VendorInvoiceOptions> {
    const params = invoiceId ? { invoice_id: String(invoiceId) } : undefined;
    return this.http.get<ApiResponse<VendorInvoiceOptions>>(`${this.baseUrl}/options`, { params }).pipe(map((res) => res.data));
  }

  getById(id: number): Observable<VendorInvoice> {
    return this.http.get<ApiResponse<VendorInvoice>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  create(payload: VendorInvoicePayload): Observable<ApiResponse<VendorInvoice>> {
    return this.http.post<ApiResponse<VendorInvoice>>(this.baseUrl, payload);
  }

  // Replaces the whole invoice; the number stays the same.
  update(id: number, payload: VendorInvoicePayload): Observable<ApiResponse<VendorInvoice>> {
    return this.http.put<ApiResponse<VendorInvoice>>(`${this.baseUrl}/${id}`, payload);
  }

  // 409 while it has payments.
  cancel(id: number): Observable<ApiResponse<VendorInvoice>> {
    return this.http.patch<ApiResponse<VendorInvoice>>(`${this.baseUrl}/${id}/cancel`, {});
  }

  addPayment(id: number, payload: PaymentPayload): Observable<ApiResponse<VendorInvoice>> {
    return this.http.post<ApiResponse<VendorInvoice>>(`${this.baseUrl}/${id}/payments`, payload);
  }

  removePayment(id: number, paymentId: number): Observable<ApiResponse<VendorInvoice>> {
    return this.http.delete<ApiResponse<VendorInvoice>>(`${this.baseUrl}/${id}/payments/${paymentId}`);
  }

  // The full response is returned so the file name can be read from Content-Disposition.
  pdf(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob', observe: 'response' });
  }
}
