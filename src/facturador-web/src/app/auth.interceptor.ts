import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiConfigService } from './api-config.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const config = inject(ApiConfigService);
  const token = auth.token();
  const isApi = config.isApiUrl(req.url);
  const request = token && isApi && !req.url.endsWith('/auth/login')
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(request).pipe(catchError((error: HttpErrorResponse) => {
    if (isApi && error.status === 401 && !req.url.endsWith('/auth/login')) auth.logout();
    return throwError(() => error);
  }));
};
