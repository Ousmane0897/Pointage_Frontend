import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { JwtPayload } from '../models/JwtPayload.model';


@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private baseUrl = environment.apiUrlEmploye

  constructor(private http: HttpClient) {}


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


   private decodeToken(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = atob(token.split('.')[1]);
      return JSON.parse(payload) as JwtPayload;
    } catch (e) {
      this.logout(); // token is malformed
      return null;
    }
  }

  isLoggedIn(): boolean {
    const payload = this.decodeToken();
    if (!payload) return false;

    const expiry = payload.exp;
    const now = Math.floor(Date.now() / 1000);

    if (expiry && expiry < now) {
      this.logout(); // clean up expired token
      return false;
    }

    return true;
  }

  getUserRole(): string  {
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
    window.location.href = '/'; // Redirect to the home page
  }
}
