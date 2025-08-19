import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import e from 'express';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Planification } from '../models/planification.model';

@Injectable({
  providedIn: 'root'
})
export class PlanificationService {

  constructor(private http: HttpClient) { }

  private baseUrl = environment.apiUrlEmploye;

  token = localStorage.getItem('token'); // ou autre méthode de stockage
  headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.token
  });
  
  getPlanifications(): Observable<Planification[]> {
    return this.http.get<Planification[]>(`${this.baseUrl}/api/planification`);
  }

  getPlanificationByCodeEmploye(codeSecret: string): Observable<Planification> {
    return this.http.get<Planification>(`${this.baseUrl}/api/planification/${codeSecret}`);
  }

  addPlanification(planification: Planification): Observable<Planification> {
    return this.http.post<Planification>(`${this.baseUrl}/api/planification`, planification);
  }

  updatePlanification(codeSecret: string, planification: Planification): Observable<Planification> {
    return this.http.put<Planification>(`${this.baseUrl}/api/planification/${codeSecret}`, planification);
  }

  getPlanificationsAVenir(codeSecret: string): Observable<Planification[]> {
    return this.http.get<Planification[]>(`${this.baseUrl}/api/planification/AVenir/${codeSecret}`);
  }

  getPlanificationsEnCours(codeSecret: string): Observable<Planification[]> {
    return this.http.get<Planification[]>(`${this.baseUrl}/api/planification/EnCours/${codeSecret}`);
  }

  getPlanificationsTerminees(codeSecret: string): Observable<Planification[]> {
    return this.http.get<Planification[]>(`${this.baseUrl}/api/planification/Terminees/${codeSecret}`);

  }

  deletePlanification(codeSecret: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/planification/${codeSecret}`, { headers: this.headers });
  }
}
