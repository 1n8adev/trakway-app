import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.model';
import { InvoiceSettings } from '../models/setting.model';

// /api/admin/settings
@Injectable({ providedIn: 'root' })
export class SettingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/settings`;

  invoice(): Observable<InvoiceSettings> {
    return this.http.get<ApiResponse<InvoiceSettings>>(`${this.baseUrl}/invoice`).pipe(map((res) => res.data));
  }

  // null restores the built-in default terms.
  updateInvoice(vendorTerms: string | null): Observable<ApiResponse<InvoiceSettings>> {
    return this.http.put<ApiResponse<InvoiceSettings>>(`${this.baseUrl}/invoice`, { vendor_terms: vendorTerms });
  }
}
