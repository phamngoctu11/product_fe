import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { clearAuthStorage, decodeJwtPayload, isJwtExpired } from '../service/auth-token.util';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('accessToken');
  const isBackendRequest = req.url.startsWith(environment.apiUrl);
  const hasValidToken = !!token && !isJwtExpired(decodeJwtPayload(token));

  if (token && !hasValidToken) {
    clearAuthStorage();
  }

  const request = isBackendRequest && hasValidToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (isBackendRequest && error.status === 401 && token) {
        clearAuthStorage();
      }
      return throwError(() => error);
    }),
  );
};
