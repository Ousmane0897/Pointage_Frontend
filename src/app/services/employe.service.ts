import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Employe } from '../models/employe.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmployeService {

  constructor(private http: HttpClient) { }


   private baseUrl = environment.apiUrlEmploye;

  getEmployes(): Observable<Employe[]> {
    return this.http.get<Employe[]>(`${this.baseUrl}/api/employe`);
  }

  getEmployesChefsEquipe(): Observable<Employe[]> {
    return this.http.get<Employe[]>(`${this.baseUrl}/api/employe/Cheffes`);
  } 

  getEmployeByCodeEmploye(codeSecret: string): Observable<Employe> {
    return this.http.get<Employe>(`${this.baseUrl}/api/employe/${codeSecret}`); 
  }

  updateEmployeEnDeplacement(codeSecret: string, employe: Employe): Observable<Employe> {
    return this.http.put<Employe>(`${this.baseUrl}/api/employe/deplacement/${codeSecret}`, employe);
  }

  addEmploye(employe: Employe): Observable<Employe> {
    return this.http.post<Employe>(`${this.baseUrl}/api/employe`, employe);
  }

  updateEmploye(codeSecret: string, employe: Employe): Observable<Employe> {
    return this.http.put<Employe>(`${this.baseUrl}/api/employe/${codeSecret}`, employe);
  }

  deleteEmploye(codeSecret: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/employe/${codeSecret}`);
  }
}
