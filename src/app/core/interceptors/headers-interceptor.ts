import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth/auth.service';

export const SKIP_AUTH_HEADER = new HttpContextToken<boolean>(() => false);

const PUBLIC_AUTH_PATHS = [
  '/api/v1/auth/signin',
  '/api/v1/auth/signup',
  '/api/v1/auth/forgotPasswords',
  '/api/v1/auth/verifyResetCode',
  '/api/v1/auth/resetPassword',
];

export const headersInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH_HEADER)) {
    return next(req);
  }

  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const isPublicAuth = PUBLIC_AUTH_PATHS.some((path) => req.url.includes(path));

  if (!isApiRequest || isPublicAuth) {
    return next(req);
  }

  const token = inject(AuthService).token();
  if (!token) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: {
      token,
    },
  });

  return next(cloned);
};
