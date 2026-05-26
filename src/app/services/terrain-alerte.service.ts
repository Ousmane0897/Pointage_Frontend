import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AlerteTerrain,
  FiltreAlerte,
  ParametresEscalade,
  RecapitulatifQuotidien,
} from '../models/terrain-alerte.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service des Alertes & Escalade — Module Exploitation Terrain (5.2).
 *
 * Le temps réel se fait via WebSocket (topic /topic/alertes-terrain) ;
 * ce service ne gère que les appels REST (historique, résolution, paramètres).
 */
@Injectable({ providedIn: 'root' })
export class TerrainAlerteService {

  private baseUrl = `${environment.apiUrl}/terrain/alertes`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 30,
    filtres?: FiltreAlerte,
  ): Observable<PageResponse<AlerteTerrain>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.type) params = params.set('type', filtres.type);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.niveauActuel) params = params.set('niveauActuel', filtres.niveauActuel);
    if (filtres?.employeId) params = params.set('employeId', filtres.employeId);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    return this.http.get<PageResponse<AlerteTerrain>>(this.baseUrl, { params });
  }

  /** Alertes courantes (statut OUVERTE / NOTIFIEE / ESCALADEE). */
  alertesCourantes(): Observable<AlerteTerrain[]> {
    return this.http.get<AlerteTerrain[]>(`${this.baseUrl}/courantes`);
  }

  getById(id: string): Observable<AlerteTerrain> {
    return this.http.get<AlerteTerrain>(`${this.baseUrl}/${id}`);
  }

  /** Marquer une alerte comme traitée avec commentaire. */
  traiter(id: string, commentaire: string): Observable<AlerteTerrain> {
    return this.http.post<AlerteTerrain>(`${this.baseUrl}/${id}/traiter`, {
      commentaire,
    });
  }

  justifier(id: string, motif: string): Observable<AlerteTerrain> {
    return this.http.post<AlerteTerrain>(`${this.baseUrl}/${id}/justifier`, {
      motif,
    });
  }

  /** Escalade manuelle au niveau suivant. */
  escalader(id: string, motif?: string): Observable<AlerteTerrain> {
    return this.http.post<AlerteTerrain>(`${this.baseUrl}/${id}/escalader`, {
      motif,
    });
  }

  recapitulatifQuotidien(date?: string): Observable<RecapitulatifQuotidien> {
    const params = date ? new HttpParams().set('date', date) : new HttpParams();
    return this.http.get<RecapitulatifQuotidien>(`${this.baseUrl}/recap-quotidien`, {
      params,
    });
  }

  // ─── Paramètres d'escalade ──────────────────────────────────────────────

  getParametres(): Observable<ParametresEscalade> {
    return this.http.get<ParametresEscalade>(`${this.baseUrl}/parametres`);
  }

  modifierParametres(parametres: ParametresEscalade): Observable<ParametresEscalade> {
    return this.http.put<ParametresEscalade>(`${this.baseUrl}/parametres`, parametres);
  }
}
