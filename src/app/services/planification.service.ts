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

  getPlanificationById(id: string): Observable<Planification> {
    return this.http.get<Planification>(`${this.baseUrl}/api/planification/${id}`);
  }

  getPlanificationsTerminees(codeSecret: string): Observable<Planification[]> {
    return this.http.get<Planification[]>(`${this.baseUrl}/api/planification/Terminees/${codeSecret}`);

  }

  cancelPlanification(id: string, motif: string): Observable<Planification> {
    return this.http.post<Planification>('/api/planification/cancel', { id, motif });
  }



  deletePlanification(codeSecret: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/planification/${codeSecret}`);
  }

  demanderAnnulation(id: string, motif: string, requestedBy?: string): Observable<any> {
    const body = { id, motif, requestedBy };
    return this.http.post<any>(`${this.baseUrl}/api/planification/demander`, body);
  }

  validerAnnulation(id: string, accepted: boolean, validatedBy?: string): Observable<any> {
    const body = { id, accepted, validatedBy };
    return this.http.post<any>(`${this.baseUrl}/api/planification/valider`, body);
  }
}
