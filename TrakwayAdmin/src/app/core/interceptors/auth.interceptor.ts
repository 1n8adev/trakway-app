import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

// Adds "Authorization: Bearer <token>" to API calls and logs out when the API returns 401.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  const isApiCall = req.url.startsWith(environment.apiUrl);
  const isLogin = req.url.endsWith('/admin/auth/login');

  const request =
    token && isApiCall && !isLogin ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      // A 401 from login means wrong credentials; the login page shows that itself.
      if (err instanceof HttpErrorResponse && err.status === 401 && isApiCall && !isLogin) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
