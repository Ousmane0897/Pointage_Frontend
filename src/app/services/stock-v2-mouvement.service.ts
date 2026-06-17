import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MouvementStock,
  MouvementPayload,
  FiltreMouvement,
} from '../models/stock-v2-mouvement.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service des Mouvements de stock — Module Stock v2 / 7.3.
 *
 * Entrées / sorties / transferts inter-sites. L'utilisateur créateur est
 * déduit du JWT côté serveur.
 */
@Injectable({ providedIn: 'root' })
export class StockV2MouvementService {

  private baseUrl = `${environment.apiUrl}/stock/mouvements`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreMouvement,
  ): Observable<PageResponse<MouvementStock>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.produitId) params = params.set('produitId', filtres.produitId);
    if (filtres?.type) params = params.set('type', filtres.type);
    if (filtres?.motif) params = params.set('motif', filtres.motif);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    return this.http.get<PageResponse<MouvementStock>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<MouvementStock> {
    return this.http.get<MouvementStock>(`${this.baseUrl}/${id}`);
  }

  enregistrer(payload: MouvementPayload): Observable<MouvementStock> {
    return this.http.post<MouvementStock>(this.baseUrl, payload);
  }
}
