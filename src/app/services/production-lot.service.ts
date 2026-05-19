import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Lot,
  FiltreLot,
  TracabiliteLot,
} from '../models/production-lot.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service de gestion des Lots produits & traçabilité — Module Production
 * Chimie (5.1). Les lots sont générés automatiquement à la terminaison
 * d'un OF ; ce service est principalement en lecture.
 */
@Injectable({ providedIn: 'root' })
export class ProductionLotService {

  private baseUrl = `${environment.apiUrl}/production-chimie/lots`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreLot,
  ): Observable<PageResponse<Lot>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.produitNom) params = params.set('produitNom', filtres.produitNom);
    if (filtres?.formulationId) params = params.set('formulationId', filtres.formulationId);
    if (filtres?.statutControle) params = params.set('statutControle', filtres.statutControle);
    if (filtres?.statutStock) params = params.set('statutStock', filtres.statutStock);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    return this.http.get<PageResponse<Lot>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<Lot> {
    return this.http.get<Lot>(`${this.baseUrl}/${id}`);
  }

  /** Retourne l'arbre complet de traçabilité d'un lot. */
  getTracabilite(id: string): Observable<TracabiliteLot> {
    return this.http.get<TracabiliteLot>(`${this.baseUrl}/${id}/tracabilite`);
  }
}
