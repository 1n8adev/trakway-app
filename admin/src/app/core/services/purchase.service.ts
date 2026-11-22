import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { Purchase, PurchaseFilters, PurchaseOptions, PurchasePayload } from '../models/purchase.model';

export type PurchaseList = PaginatedResponse<Purchase> & { summary: { total_amount: number } };

// /api/admin/purchases
@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/purchases`;

  list(filters: PurchaseFilters = {}): Observable<PurchaseList> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PurchaseList>(this.baseUrl, { params });
  }

  options(): Observable<PurchaseOptions> {
    return this.http.get<ApiResponse<PurchaseOptions>>(`${this.baseUrl}/options`).pipe(map((res) => res.data));
  }

  getById(id: number): Observable<Purchase> {
    return this.http.get<ApiResponse<Purchase>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  create(payload: PurchasePayload): Observable<ApiResponse<Purchase>> {
    return this.http.post<ApiResponse<Purchase>>(this.baseUrl, this.toFormData(payload));
  }

  update(id: number, payload: PurchasePayload): Observable<ApiResponse<Purchase>> {
    return this.http.put<ApiResponse<Purchase>>(`${this.baseUrl}/${id}`, this.toFormData(payload));
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }

  // The bill is private, so it's fetched with the token as a blob.
  bill(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/bill`, { responseType: 'blob' });
  }

  private toFormData(p: PurchasePayload): FormData {
    const fd = new FormData();
    if (p.supplier_id) fd.append('supplier_id', String(p.supplier_id));
    fd.append('bill_no', p.bill_no);
    fd.append('bill_date', p.bill_date);
    fd.append('notes', p.notes ?? '');
    fd.append('items', JSON.stringify(p.items));
    if (p.bill_file) fd.append('bill_file', p.bill_file, p.bill_file.name);
    if (p.remove_bill_file) fd.append('remove_bill_file', 'true');
    return fd;
  }
}
