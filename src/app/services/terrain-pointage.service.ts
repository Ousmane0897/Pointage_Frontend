import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PointageTerrain,
  FiltrePointageTerrain,
} from '../models/terrain-pointage.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service du Pointage Terrain GPS — Module Exploitation Terrain (5.2).
 *
 * Le calcul de distance Haversine côté front (terrain-geolocation.service)
 * détermine le statut SUR_SITE / HORS_ZONE avant POST. Le backend revalide
 * (anti-spoof) et déclenche les alertes via WebSocket si nécessaire.
 */
@Injectable({ providedIn: 'root' })
export class TerrainPointageService {

  private baseUrl = `${environment.apiUrl}/terrain/pointages`;

  constructor(private http: HttpClient) {}

  /** Crée un pointage (entrée ou sortie) à partir du payload pré-calculé. */
  creerPointage(pointage: PointageTerrain): Observable<PointageTerrain> {
    return this.http.post<PointageTerrain>(this.baseUrl, pointage);
  }

  /** Pointages du jour pour l'agent connecté (interface mobile). */
  pointagesDuJour(employeId: string): Observable<PointageTerrain[]> {
    const params = new HttpParams().set('employeId', employeId);
    return this.http.get<PointageTerrain[]>(`${this.baseUrl}/jour`, { params });
  }

  /** Liste superviseur : tous les pointages du jour, tous agents. */
  pointagesAujourdHui(): Observable<PointageTerrain[]> {
    return this.http.get<PointageTerrain[]>(`${this.baseUrl}/aujourd-hui`);
  }

  historique(
    page = 0,
    size = 50,
    filtres?: FiltrePointageTerrain,
  ): Observable<PageResponse<PointageTerrain>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.employeId) params = params.set('employeId', filtres.employeId);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.type) params = params.set('type', filtres.type);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    return this.http.get<PageResponse<PointageTerrain>>(
      `${this.baseUrl}/historique`,
      { params },
    );
  }

  getById(id: string): Observable<PointageTerrain> {
    return this.http.get<PointageTerrain>(`${this.baseUrl}/${id}`);
  }
}
