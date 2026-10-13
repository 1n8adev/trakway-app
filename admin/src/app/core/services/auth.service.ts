import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.model';
import { AdminProfile, LoginRequest, LoginResponse } from '../models/auth.model';
import { TokenStorageService } from './token-storage.service';
import { isTokenExpired } from '../utils/jwt';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(TokenStorageService);
  private readonly baseUrl = `${environment.apiUrl}/admin/auth`;

  private readonly token = signal<string | null>(this.storage.get());
  readonly admin = signal<AdminProfile | null>(null);

  getToken(): string | null {
    return this.token();
  }

  // Not a computed(): expiry depends on the clock, so it is re-checked on every call.
  isLoggedIn(): boolean {
    const token = this.token();
    return !!token && !isTokenExpired(token);
  }

  // remember = false keeps the token only until the browser is closed.
  login(body: LoginRequest, remember = true): Observable<LoginResponse> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/login`, body).pipe(
      map((res) => res.data),
      tap(({ token }) => {
        this.storage.set(token, remember);
        this.token.set(token);
      }),
    );
  }

  // Loads the signed-in admin once; later calls reuse the cached profile.
  loadProfile(): Observable<AdminProfile | null> {
    const cached = this.admin();
    if (cached) return of(cached);
    return this.http.get<ApiResponse<AdminProfile>>(`${this.baseUrl}/me`).pipe(
      map((res) => res.data),
      tap((admin) => this.admin.set(admin)),
      catchError(() => of(null)),
    );
  }

  // NOTE: TrakwayAPI does not expose this endpoint yet.
  forgotPassword(email: string): Observable<string> {
    return this.http
      .post<ApiResponse<null>>(`${this.baseUrl}/forgot-password`, { email })
      .pipe(map((res) => res.message));
  }

  // JWT is stateless, so logout just drops the token on the client.
  logout(redirect = true): void {
    this.storage.clear();
    this.token.set(null);
    this.admin.set(null);
    if (redirect) this.router.navigate(['/login']);
  }
}
