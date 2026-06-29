import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  BonSortie,
  BonSortiePayload,
  FiltreBonSortie,
} from '../models/stock-v2-bon-sortie.model';
import { DecisionWorkflowPayload } from '../models/stock-v2-workflow.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service des Bons de sortie — Module Stock v2 / 7.4.
 *
 * CRUD (édition à l'état BROUILLON) + transitions workflow. La validation
 * vérifie le stock disponible (422 si insuffisant), génère les mouvements
 * (type SORTIE) et bascule le bon en EFFECTIF.
 */
@Injectable({ providedIn: 'root' })
export class StockV2BonSortieService {

  private baseUrl = `${environment.apiUrl}/stock/bons-sortie`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreBonSortie,
  ): Observable<PageResponse<BonSortie>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.type) params = params.set('type', filtres.type);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    return this.http.get<PageResponse<BonSortie>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<BonSortie> {
    return this.http.get<BonSortie>(`${this.baseUrl}/${id}`);
  }

  creer(payload: BonSortiePayload): Observable<BonSortie> {
    return this.http.post<BonSortie>(this.baseUrl, payload);
  }

  modifier(id: string, payload: BonSortiePayload): Observable<BonSortie> {
    return this.http.put<BonSortie>(`${this.baseUrl}/${id}`, payload);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ─── Transitions workflow ─────────────────────────────────────────────────

  soumettre(id: string): Observable<BonSortie> {
    return this.http.post<BonSortie>(`${this.baseUrl}/${id}/soumettre`, {});
  }

  valider(id: string, payload?: DecisionWorkflowPayload): Observable<BonSortie> {
    return this.http.post<BonSortie>(`${this.baseUrl}/${id}/valider`, payload ?? {});
  }

  refuser(id: string, payload: DecisionWorkflowPayload): Observable<BonSortie> {
    return this.http.post<BonSortie>(`${this.baseUrl}/${id}/refuser`, payload);
  }
}
