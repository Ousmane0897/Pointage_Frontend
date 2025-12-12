import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private baseUrl = environment.apiUrlEmploye

  constructor(private http: HttpClient) {}

  forgotPassword(email: string) {
    return this.http.post<{ message: string }>(`${this.baseUrl}/auth/forgot-password`, { email: email }); // message est une confirmation de l'envoi du code en provenance du backend
  }

  resetPassword(code: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${this.baseUrl}/auth/reset-password`, { code, newPassword }); // { code, newPassword } envoie un objet avec le code et le nouveau mot de passe au backend  
  }
}
