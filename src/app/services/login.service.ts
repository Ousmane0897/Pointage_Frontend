import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Subject } from 'rxjs';
import { Router } from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private permissionsSubject = new BehaviorSubject<any>({});
  permissions$ = this.permissionsSubject.asObservable(); // Observable pour les modules autorisés

  private baseUrl = environment.apiUrlEmploye

  constructor(private http: HttpClient, private router: Router) { }

  permissionsChanged = new Subject<void>();


  notifyPermissionsChanged() {
    const payload = this.decodeToken();
    const modules = payload?.modules || {};
    this.permissionsSubject.next(modules);
  }

  getUserPermissions(): any {
    const fromStorage = localStorage.getItem("modulesAutorises");
    if (fromStorage) return JSON.parse(fromStorage);

    const payload = this.decodeToken();
    return payload?.modules || {};
  }

  changePassword(email: string, oldPassword: string, newPassword: string, confirmPassword: string, role: string | null) {
    return this.http.post<{ message: string, token: string }>(`${this.baseUrl}/api/login/change-password`, { email, oldPassword, newPassword, confirmPassword, role }); // message est une confirmation du changement de mot de passe en provenance du backend
  }

  getUserEmail(): string | null {
    const payload = this.decodeToken();
    if (!payload || !payload.email) return null;
    return payload.email;
  }

  getMustChangePassword(): boolean {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.mustChangePassword === true; // Retourne true si mustChangePassword est true, sinon false
  }


  login(email: string, password: string) {
    return this.http.post<{ token: string }>(`${this.baseUrl}/api/login`, { email, password }, {
      withCredentials: true
    });
  }


  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }


  decodeToken(): any {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (e) {
      this.logout(); // token is malformed
      console.error("Erreur de décodage du token :", e);
      return null;
    }
  }


  isLoggedIn(): boolean {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const payload = this.decodeToken();
    if (!payload) return false;

    const expiry = payload.exp;
    const now = Math.floor(Date.now() / 1000);

    if (!expiry || expiry < now) {
      this.logout();
      return false;
    }

    return true;
  }


  getUserRole(): string {
    const payload = this.decodeToken();
    if (!payload || !payload.role) return 'No role found';
    return payload.role.trim();
  }

  getUserPoste(): string {
    const payload = this.decodeToken();
    if (!payload || !payload.poste) return 'No poste found';
    return payload.poste.trim();
  }


  getFirstNameLastName(): string | null {
    const payload = this.decodeToken();
    if (!payload) return null;

    const prenom = payload.prenom || '';
    const nom = payload.nom || '';

    if (!prenom && !nom) return null; // aucun prénom ni nom → retourne null

    return `${prenom} ${nom}`.trim();
  }

  logout() {
    localStorage.removeItem('token');
     this.router.navigateByUrl('/');
  }

}
