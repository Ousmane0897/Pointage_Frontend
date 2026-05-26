import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FicheIntervention,
  FiltreIntervention,
} from '../models/terrain-intervention.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service des Fiches d'Intervention — Module Exploitation Terrain (5.2).
 */
@Injectable({ providedIn: 'root' })
export class TerrainInterventionService {

  private baseUrl = `${environment.apiUrl}/terrain/interventions`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreIntervention,
  ): Observable<PageResponse<FicheIntervention>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.employeId) params = params.set('employeId', filtres.employeId);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    return this.http.get<PageResponse<FicheIntervention>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<FicheIntervention> {
    return this.http.get<FicheIntervention>(`${this.baseUrl}/${id}`);
  }

  /** Création/édition d'une fiche avec photos en FormData. */
  creer(formData: FormData): Observable<FicheIntervention> {
    return this.http.post<FicheIntervention>(this.baseUrl, formData);
  }

  modifier(id: string, formData: FormData): Observable<FicheIntervention> {
    return this.http.put<FicheIntervention>(`${this.baseUrl}/${id}`, formData);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Photo authentifiée (JWT) — Blob converti en SafeUrl côté composant. */
  getPhoto(interventionId: string, index: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/${interventionId}/photos/${index}`,
      { responseType: 'blob' },
    );
  }

  /** Génération PDF côté serveur (l'option côté client existe aussi via terrain-pdf.service). */
  exporterPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
