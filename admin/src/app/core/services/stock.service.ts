import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.model';
import { StockFilters, StockHistory, StockItemType, StockList } from '../models/stock.model';

// /api/admin/stock
@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/stock`;

  list(filters: StockFilters = {}): Observable<StockList> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<ApiResponse<StockList>>(this.baseUrl, { params }).pipe(map((res) => res.data));
  }

  history(type: StockItemType, id: number): Observable<StockHistory> {
    return this.http.get<ApiResponse<StockHistory>>(`${this.baseUrl}/${type}/${id}/history`).pipe(map((res) => res.data));
  }
}
