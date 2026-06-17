import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Inventaire,
  InventairePayload,
  ComptagePayload,
  FiltreInventaire,
} from '../models/stock-v2-inventaire.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service des Inventaires — Module Stock v2 / 7.3.
 *
 * Workflow BROUILLON → COMPTAGE → VALIDATION → CLOTURE via des transitions
 * dédiées côté serveur (qui figent les quantités théoriques et appliquent les
 * écarts au stock à la clôture).
 */
@Injectable({ providedIn: 'root' })
export class StockV2InventaireService {

  private baseUrl = `${environment.apiUrl}/stock/inventaires`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreInventaire,
  ): Observable<PageResponse<Inventaire>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    return this.http.get<PageResponse<Inventaire>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<Inventaire> {
    return this.http.get<Inventaire>(`${this.baseUrl}/${id}`);
  }

  /** Planification (création d'un brouillon). */
  creer(payload: InventairePayload): Observable<Inventaire> {
    return this.http.post<Inventaire>(this.baseUrl, payload);
  }

  modifier(id: string, payload: InventairePayload): Observable<Inventaire> {
    return this.http.put<Inventaire>(`${this.baseUrl}/${id}`, payload);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ─── Transitions de workflow ────────────────────────────────────────────

  /** BROUILLON → COMPTAGE : fige les quantités théoriques. */
  demarrerComptage(id: string): Observable<Inventaire> {
    return this.http.post<Inventaire>(`${this.baseUrl}/${id}/comptage`, {});
  }

  /** Sauvegarde des comptages physiques (état COMPTAGE). */
  enregistrerComptage(id: string, payload: ComptagePayload): Observable<Inventaire> {
    return this.http.put<Inventaire>(`${this.baseUrl}/${id}/comptage`, payload);
  }

  /** COMPTAGE → VALIDATION. */
  soumettreValidation(id: string): Observable<Inventaire> {
    return this.http.post<Inventaire>(`${this.baseUrl}/${id}/validation`, {});
  }

  /** VALIDATION → CLOTURE : applique les écarts au stock. */
  cloturer(id: string): Observable<Inventaire> {
    return this.http.post<Inventaire>(`${this.baseUrl}/${id}/cloture`, {});
  }
}
