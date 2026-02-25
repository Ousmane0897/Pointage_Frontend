import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Employe } from '../models/employe.model';
import { environment } from '../../environments/environment';
import { Planification } from '../models/planification.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeService {

  constructor(private http: HttpClient) { }


   private baseUrl = environment.apiUrl;

  getEmployes(): Observable<Employe[]> {
    return this.http.get<Employe[]>(`${this.baseUrl}/employe`);
  }

  getEmployeesDansUnSite(site: string): Observable<Employe[]> {
    return this.http.get<Employe[]>(`${this.baseUrl}/employe/employeesDansUnSite?site=${encodeURIComponent(site)}`);
  }
  
  getEmployeByCodeEmploye(codeSecret: string): Observable<Employe> {
    return this.http.get<Employe>(`${this.baseUrl}/employe/${codeSecret}`); 
  }

  getEmployeEnDeplacement(): Observable<Employe[]> {
    return this.http.get<Employe[]>(`${this.baseUrl}/employe/enDeplacement`);
  }

  updateEmployeEnDeplacement(codeSecret: string, planfication: Planification): Observable<Employe> {
    return this.http.put<Employe>(`${this.baseUrl}/employe/deplacement/${codeSecret}`, planfication);
  }

  addEmploye(employe: Employe): Observable<Employe> {
    return this.http.post<Employe>(`${this.baseUrl}/employe`, employe);
  }

  updateEmploye(codeSecret: string, employe: Employe): Observable<Employe> {
    return this.http.put<Employe>(`${this.baseUrl}/employe/${codeSecret}`, employe);
  }

  deleteEmploye(codeSecret: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/employe/${codeSecret}`);
  }
}
