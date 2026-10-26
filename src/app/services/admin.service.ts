import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Admin, RattachementDossier } from '../models/admin.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAdmins(): Observable<Admin[]> {
    return this.http.get<Admin[]>(`${this.baseUrl}/superadmin`);
  }

  createAdmin(admin: Admin): Observable<Admin> {
    return this.http.post<Admin>(`${this.baseUrl}/superadmin`, admin);
  }

  updateAdmin(id: string, admin: Admin): Observable<Admin> {
    return this.http.put<Admin>(`${this.baseUrl}/superadmin/${id}`, admin);
  } 

  deleteAdmin(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/superadmin/${id}`);
  } 

  /** Dossier employé rattaché à chaque compte, par email. */
  getRattachements(): Observable<RattachementDossier[]> {
    return this.http.get<RattachementDossier[]>(`${this.baseUrl}/superadmin/rattachements`);
  }

  /** Dossier employé portant cet email, avant l'enregistrement du compte. */
  getRattachement(email: string): Observable<RattachementDossier> {
    return this.http.get<RattachementDossier>(`${this.baseUrl}/superadmin/rattachement`, { params: { email } });
  }
}
