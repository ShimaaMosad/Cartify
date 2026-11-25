import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { NgxSpinnerModule } from 'ngx-spinner';
import { provideToastr } from 'ngx-toastr';

import { routes } from './app.routes';
import { headersInterceptor } from './core/interceptors/headers-interceptor';
import { loadingInterceptor } from './core/interceptors/loading-interceptor';
import { errorInterceptor } from './core/interceptors/errors-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    provideAnimations(),
    importProvidersFrom(NgxSpinnerModule.forRoot({ type: 'ball-clip-rotate' })),
    provideToastr({
      timeOut: 4000, // ٤ ثواني كفاية للقراءة من غير ما يضايق
      extendedTimeOut: 1000, // ثانية زيادة لو اليوزر حط الماوس عليه
      easeTime: 300, // حركة دخول وخروج ناعمة
      positionClass: 'toast-top-right', // أنسب مكان للـ e-commerce فوق على اليمين
      tapToDismiss: true, // يختفي لما اليوزر يضغط عليه
      closeButton: true, // زرار X واضح للي حابب يقفله بسرعة
      preventDuplicates: true, // يمنع تكرار نفس الرسالة لو اليوزر ضغط كذا مرة
      newestOnTop: true, // الأحدث يظهر فوق
      progressBar: true, // الخط اللي تحت اللي بيوضح الوقت المتبقي
      progressAnimation: 'decreasing', // بينقص تدريجيًا لحد ما يختفي
      maxOpened: 3, // أقصى عدد ٣ إشعارات عشان ما يملاش الشاشة
      autoDismiss: true, // يقفل القديم تلقائي لو زاد عن ٣
    }),
    provideHttpClient(
      withFetch(),
      withInterceptors([headersInterceptor, loadingInterceptor, errorInterceptor]),
    ),
  ],
};
