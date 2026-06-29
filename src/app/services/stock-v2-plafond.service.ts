import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Plafond,
  PlafondPayload,
  FiltrePlafond,
  ConsommationPlafond,
} from '../models/stock-v2-plafond.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service des Plafonds de dotation — Module Stock v2 / 7.4 (fonctionnalité 7).
 *
 * CRUD des plafonds (site × produit ou site × catégorie) + récupération de la
 * consommation mensuelle observée vs plafond (données des jauges et alertes).
 */
@Injectable({ providedIn: 'root' })
export class StockV2PlafondService {

  private baseUrl = `${environment.apiUrl}/stock/plafonds`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltrePlafond,
  ): Observable<PageResponse<Plafond>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.granularite) params = params.set('granularite', filtres.granularite);
    if (filtres?.actif !== undefined && filtres?.actif !== null) {
      params = params.set('actif', filtres.actif);
    }
    return this.http.get<PageResponse<Plafond>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<Plafond> {
    return this.http.get<Plafond>(`${this.baseUrl}/${id}`);
  }

  creer(payload: PlafondPayload): Observable<Plafond> {
    return this.http.post<Plafond>(this.baseUrl, payload);
  }

  modifier(id: string, payload: PlafondPayload): Observable<Plafond> {
    return this.http.put<Plafond>(`${this.baseUrl}/${id}`, payload);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Consommation observée vs plafond pour un mois donné (jauges + alertes). */
  consommation(mois: string, siteId?: string): Observable<ConsommationPlafond[]> {
    let params = new HttpParams().set('mois', mois);
    if (siteId) params = params.set('siteId', siteId);
    return this.http.get<ConsommationPlafond[]>(`${this.baseUrl}/consommation`, { params });
  }
}
