import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginService } from './services/login.service';

@Injectable({providedIn: 'root'})
export class AuthInterceptor implements HttpInterceptor {

  constructor(private loginService: LoginService) {}

  intercept(req: HttpRequest<any>,next: HttpHandler): Observable<HttpEvent<any>> {
    console.log('Interceptor intercepting:', req.url);
     const token = this.loginService.getToken();

    // Ne pas ajouter le token pour les routes publiques
    if (token && !req.url.includes('/api/login') && !req.url.includes('/api/pointages')) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`) // Modifier la requête pour ajouter le token dans l'en-tete avant de l'envoyer
      });
      return next.handle(cloned);// Envoyer la requête clonée ou modifiée avec le token ajouté.
    }

    return next.handle(req);// Si pas de token ou requête publique, envoyer la requete au backend sans modification
  }
}
