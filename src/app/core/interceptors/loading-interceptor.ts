import { isPlatformBrowser } from '@angular/common';
import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { finalize } from 'rxjs';

export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

let activeRequests = 0;

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_LOADING)) {
    return next(req);
  }

  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const spinner = isBrowser ? inject(NgxSpinnerService) : null;

  if (isBrowser && spinner) {
    activeRequests++;
    spinner.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (isBrowser && spinner) {
        activeRequests = Math.max(0, activeRequests - 1);
        if (activeRequests === 0) {
          spinner.hide();
        }
      }
    }),
  );
};
