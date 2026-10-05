import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Session } from './session';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(Session);
  const token = session.token();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return next(req.clone({ setHeaders: headers })).pipe(
    catchError((error: unknown) => {
      // A token we sent was refused: expired or revoked. Forget it, the guard sends the user to login.
      if (token && error instanceof HttpErrorResponse && error.status === 401) {
        session.set(null);
        session.expired.update((n) => n + 1);
      }
      return throwError(() => error);
    }),
  );
};
