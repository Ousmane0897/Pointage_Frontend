import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EtatStock,
  FiltreEtatStock,
  SeuilPayload,
} from '../models/stock-v2-etat-stock.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service de l'État du stock temps réel — Module Stock v2 / 7.3.
 *
 * Vue agrégée des quantités disponibles par produit / site, avec statut
 * d'alerte calculé côté serveur et valorisation FCFA.
 */
@Injectable({ providedIn: 'root' })
export class StockV2EtatStockService {

  private baseUrl = `${environment.apiUrl}/stock/etat-stock`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreEtatStock,
  ): Observable<PageResponse<EtatStock>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.categorieId) params = params.set('categorieId', filtres.categorieId);
    if (filtres?.typeProduit) params = params.set('typeProduit', filtres.typeProduit);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.parSite !== undefined) params = params.set('parSite', filtres.parSite);
    return this.http.get<PageResponse<EtatStock>>(this.baseUrl, { params });
  }

  /** Mise à jour du seuil d'alerte (global produit ou couple produit/site). */
  majSeuil(payload: SeuilPayload): Observable<EtatStock> {
    return this.http.put<EtatStock>(`${this.baseUrl}/seuils`, payload);
  }
}
