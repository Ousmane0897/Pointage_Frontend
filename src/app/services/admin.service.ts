import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Admin } from '../models/admin.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private baseUrl = environment.apiUrlEmploye;

  constructor(private http: HttpClient) {}

  getAdmins(): Observable<Admin[]> {
    return this.http.get<Admin[]>(`${this.baseUrl}/api/superadmin`);
  }

  createAdmin(admin: Admin): Observable<Admin> {
    return this.http.post<Admin>(`${this.baseUrl}/api/superadmin`, admin);
  }

  updateAdmin(identifiant: string, admin: Admin): Observable<Admin> {
    return this.http.put<Admin>(`${this.baseUrl}/api/superadmin/${identifiant}`, admin);
  } 

  deleteAdmin(identifiant: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/superadmin/${identifiant}`);
  } 
}
