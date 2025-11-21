import { ApplicationConfig, importProvidersFrom, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { routes } from './app.routes';
import { AuthInterceptor } from './auth.interceptor';
import { NgxSpinnerModule } from 'ngx-spinner';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { LucideAngularModule, ArrowUp, ArrowDown, Package, Activity, ChartBar, FileText, UserX, ArchiveX, FolderArchive, NotebookPen, TrendingUp } from 'lucide-angular';

// ✅ Ajout pour activer le format français
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideRouter(routes),
    provideClientHydration(),
    importProvidersFrom(NgxMatTimepickerModule.setLocale('fr-FR')),
    importProvidersFrom(NgxSpinnerModule),
    provideAnimations(),
    importProvidersFrom(
      CalendarModule.forRoot({
        provide: DateAdapter,
        useFactory: adapterFactory,
      })
    ),
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },  // ✅ Material en FR
    { provide: LOCALE_ID, useValue: 'fr-FR' },        // ✅ DatePipe en FR
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    importProvidersFrom(
      LucideAngularModule.pick({
        ArrowUp,
        ArrowDown,
        Package,
        Activity,
        ChartBar,
        FileText,
        UserX,
        ArchiveX,
        FolderArchive,
        NotebookPen,
        TrendingUp
      })
    ),
    provideToastr({
      timeOut: 4000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      progressBar: true,
      progressAnimation: 'decreasing',
    }),
  ],
};
