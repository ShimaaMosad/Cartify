import { isPlatformBrowser } from '@angular/common';
import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export const HANDLED_BY_COMPONENT = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const toastr = isBrowser ? inject(ToastrService) : null;
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      const skipInterceptorToast = req.context.get(HANDLED_BY_COMPONENT);

      if (isBrowser && toastr && !skipInterceptorToast) {
        if (error instanceof HttpErrorResponse) {
          if (error.status === 0) {
            toastr.error('Please check your internet connection.', 'Connection Issue');
          } else if (error.status === 401) {
            authService.clearSession();
            toastr.error('Your session expired. Please sign in again.', 'Session Ended');
            router.navigate(['/login']);
          } else {
            const msg =
              error.error?.message ||
              error.error?.errors?.[0]?.msg ||
              `Request failed (${error.status}).`;
            toastr.error(msg, 'Error');
          }
        } else {
          toastr.error('Something went wrong. Please try again.', 'Error');
        }
      }

      return throwError(() => error);
    }),
  );
};
