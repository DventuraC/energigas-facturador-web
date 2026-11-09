import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isApi = req.url.startsWith('http://localhost:5000/api/');
  const request = token && isApi && !req.url.endsWith('/auth/login')
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(request).pipe(catchError((error: HttpErrorResponse) => {
    if (isApi && error.status === 401 && !req.url.endsWith('/auth/login')) auth.logout();
    return throwError(() => error);
  }));
};
