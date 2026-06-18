import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Chantier,
  ChantierPayload,
  DetailChantier,
  FiltreChantier,
} from '../models/stock-v2-chantier.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service Chantiers — 7.5 Consommations fin de chantier.
 *
 * CRUD léger de l'entité Chantier (seule entité persistée de 7.5) + agrégation
 * du détail (lignes consommées rattachées par `chantierId` aux bons de sortie
 * DISTRIBUTION_CHANTIER). La clôture fige le chantier et son rapport final.
 */
@Injectable({ providedIn: 'root' })
export class StockV2AnalyseChantierService {

  private baseUrl = `${environment.apiUrl}/stock/chantiers`;

  constructor(private http: HttpClient) {}

  lister(page = 0, size = 20, filtres?: FiltreChantier): Observable<PageResponse<Chantier>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    return this.http.get<PageResponse<Chantier>>(this.baseUrl, { params });
  }

  /** Liste légère des chantiers (pour le sélecteur — autocomplete). */
  listerActifs(): Observable<Chantier[]> {
    return this.http.get<Chantier[]>(`${this.baseUrl}/actifs`);
  }

  /** Détail agrégé d'un chantier (entité + lignes de consommation valorisées). */
  getDetail(id: string): Observable<DetailChantier> {
    return this.http.get<DetailChantier>(`${this.baseUrl}/${id}`);
  }

  creer(payload: ChantierPayload): Observable<Chantier> {
    return this.http.post<Chantier>(this.baseUrl, payload);
  }

  modifier(id: string, payload: ChantierPayload): Observable<Chantier> {
    return this.http.put<Chantier>(`${this.baseUrl}/${id}`, payload);
  }

  /** Clôture le chantier (EN_COURS → CLOTURE, figé). */
  cloturer(id: string): Observable<Chantier> {
    return this.http.post<Chantier>(`${this.baseUrl}/${id}/cloture`, {});
  }
}
