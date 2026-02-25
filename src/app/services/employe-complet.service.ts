import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { EmployeComplet } from '../models/employe-complet.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmployeCompletService {

  searchEmployes(query: string):  Observable<{content: EmployeComplet[], total?: number}> {
    
    let params = new HttpParams().set('q', query);
    return this.http.get<{content: EmployeComplet[], total?: number}>(`${this.baseUrl}/employe-complet/search`, { params });
  }

  constructor(private http: HttpClient) { }

  private baseUrl = environment.apiUrl;


  getEmployesComplet(page = 0, size = 10, q = ''): Observable<{content: EmployeComplet[], total?: number}> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q) params = params.set('q', q);
    return this.http.get<{content: EmployeComplet[], total?: number}>(`${this.baseUrl}/employe-complet/all`, { params });
  }

  getEmployeCompletByAgentId(agentId: string): Observable<EmployeComplet> {
    return this.http.get<EmployeComplet>(`${this.baseUrl}/employe-complet/${agentId}`);
  }

  getByPrenomNom(prenom: string, nom: string): Observable<EmployeComplet> {
    let params = new HttpParams().set('prenom', prenom).set('nom', nom);
    return this.http.get<EmployeComplet>(`${this.baseUrl}/employe-complet/prenomNom`, { params });
  }

  createEmployeComplet(formData: FormData): Observable<any> {
  return this.http.post<any>(`${this.baseUrl}/employe-complet/employe`, formData);
}


  getAllEmployesComplet(): Observable<EmployeComplet[]> {
    return this.http.get<EmployeComplet[]>(`${this.baseUrl}/employe-complet/all`);
  }

  updateEmployeComplet(agentId: string, formData: FormData): Observable<EmployeComplet> {
    return this.http.put<EmployeComplet>(`${this.baseUrl}/employe-complet/complet/${agentId}`, formData);
  }

  deleteEmploye(agentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/employe-complet/by-agent/${agentId}`);
  }


  /**
   * 🚀 Envoie la liste des employés vers le backend pour import massif
   */
  importEmployes(employes: EmployeComplet[]): Observable<ImportEmployeResponse> {
  return this.http.post<ImportEmployeResponse>(
    `${this.baseUrl}/employe-complet/import-excel`,
    employes   // 👈 on envoie DIRECTEMENT la liste
  );
}

}

/* ==================== DTO de réponse ==================== */

export interface ImportEmployeResponse {
  success: EmployeComplet[];
  errors: ImportError[];
}

export interface ImportError {
  line: number;
  agentId: string;
  message: string;
}
  

