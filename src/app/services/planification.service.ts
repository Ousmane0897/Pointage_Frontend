import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Planification } from '../models/planification.model';

export interface CancelRequest {
  planificationId: string;
  motif: string;
  requestedBy: string;
}

export interface AnnulationRequestMessage {
  planificationId: string;
  motif: string;
  requestedBy: string;
  dateRequest: string; // ISO string
}

@Injectable({
  providedIn: 'root'
})
export class PlanificationService {

  constructor(private http: HttpClient) { }

  private baseUrl = environment.apiUrl;

  token = localStorage.getItem('token'); // ou autre méthode de stockage
  headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.token
  });

  getPlanifications(): Observable<Planification[]> {
    return this.http.get<Planification[]>(`${this.baseUrl}/planification`);
  }

  getPlanificationByCodeEmploye(codeSecret: string): Observable<Planification> {
    return this.http.get<Planification>(`${this.baseUrl}/planification/${codeSecret}`);
  }

  addPlanification(planification: Planification): Observable<Planification> {
    return this.http.post<Planification>(`${this.baseUrl}/planification`, planification);
  }

  updatePlanification(codeSecret: string, planification: Planification): Observable<Planification> {
    return this.http.put<Planification>(`${this.baseUrl}/planification/${codeSecret}`, planification);
  }

  getPlanificationsAVenir(codeSecret: string): Observable<Planification[]> {
    return this.http.get<Planification[]>(`${this.baseUrl}/planification/AVenir/${codeSecret}`);
  }

  getPlanificationsEnCours(codeSecret: string): Observable<Planification[]> {
    return this.http.get<Planification[]>(`${this.baseUrl}/planification/EnCours/${codeSecret}`);
  }

  getPlanificationById(id: string): Observable<Planification> {
    return this.http.get<Planification>(`${this.baseUrl}/planification/${id}`);
  }

  getPlanificationsTerminees(codeSecret: string): Observable<Planification[]> {
    return this.http.get<Planification[]>(`${this.baseUrl}/planification/Terminees/${codeSecret}`);

  }

  cancelPlanification(planificationId: string, motif: string, requestedBy?: string): Observable<Planification> {
    return this.http.post<Planification>('/planification/cancel', { planificationId, motif, requestedBy });
  }



  deletePlanification(codeSecret: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/planification/${codeSecret}`);
  }

  demanderAnnulation(planificationId: string, motif: string, requestedBy?: string): Observable<CancelRequest> {
    const body = { planificationId, motif, requestedBy };
    return this.http.post<CancelRequest>(`${this.baseUrl}/planification/demander`, body,   { headers: this.headers });
  }
  
  // Méthode pour valider ou refuser une demande d'annulation
  validerAnnulation(id: string, accepted: boolean, validatedBy?: string): Observable<Planification> {
    const body = { id, accepted, validatedBy };
    return this.http.post<Planification>(`${this.baseUrl}/planification/valider`, body,   { headers: this.headers });
  }

   // Récupère toutes les demandes en attente
  getPendingRequests(): Observable<AnnulationRequestMessage[]> {
    return this.http.get<AnnulationRequestMessage[]>(`${this.baseUrl}/planification/pending`);
  }
}
