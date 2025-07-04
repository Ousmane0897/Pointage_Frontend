import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';


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

  isLoggedIn(): boolean {
  const token = this.getToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp;
    const now = Math.floor(Date.now() / 1000);

    if (expiry && expiry < now) {
      this.logout(); // clean up expired token
      return false;
    }

    return true;
  } catch (e) {
    this.logout(); // malformed token
    return false;
  }
}


setToken(token: string): void {
    localStorage.setItem('token', token);
  }
  
getToken(): string | null {
    return localStorage.getItem('token');
  }


  logout() {
    localStorage.removeItem('token');
    window.location.href = '/'; // Redirect to the home page
  }
}
