import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LoginService } from './services/login.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private loginService: LoginService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const token = this.loginService.getToken();

    // ⛔ JWT expiré → STOP TOTAL
    if (token && this.loginService.isTokenExpired(token)) {
      this.toastr.error(
        'Session expirée. Veuillez vous reconnecter.',
        'Erreur d\'authentification'
      );

      this.loginService.logout();
      this.router.navigate(['']);

      return EMPTY; // ⛔⛔⛔ TRÈS IMPORTANT
    }

    let authReq = req;

    if (
      token &&
      !req.url.includes('/api/login') &&
      !req.url.includes('/api/pointages')
    ) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {

        if (error.status === 401 || error.status === 403) {
          this.toastr.error(
            'Session expirée. Veuillez vous reconnecter.',
            'Erreur d\'authentification'
          );

          this.loginService.logout();
          this.router.navigate(['']);

          return EMPTY; // ⛔ STOP ICI AUSSI
        }

        return throwError(() => error);
      })
    );
  }
}
