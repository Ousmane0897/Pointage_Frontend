import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { O } from '@angular/cdk/overlay-module.d-B3qEQtts';
import { Superviseur } from '../models/superviseur.model';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class SuperviseursService {

  constructor(private http: HttpClient) { }

  private baseUrl = environment.apiUrlEmploye;


  getAllSuperviseurs(): Observable<Superviseur[]> {
    return this.http.get<Superviseur[]>(`${this.baseUrl}/api/superviseurs`);
  }

  getSuperviseurById(id: string): Observable<Superviseur> {
    return this.http.get<Superviseur>(`${this.baseUrl}/api/superviseurs/${id}`);
  }

  createSuperviseur(superviseur: Superviseur): Observable<Superviseur> {
    return this.http.post<Superviseur>(`${this.baseUrl}/api/superviseurs`, superviseur);
  }

  updateSuperviseur(id: string, superviseur: Superviseur): Observable<Superviseur> {
    return this.http.put<Superviseur>(`${this.baseUrl}/api/superviseurs/${id}`, superviseur);
  }

  deleteSuperviseur(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/superviseurs/${id}`);
  }
}
