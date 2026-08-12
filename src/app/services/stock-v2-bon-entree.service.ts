import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  BonEntree,
  BonEntreePayload,
  FiltreBonEntree,
} from '../models/stock-v2-bon-entree.model';
import { DecisionWorkflowPayload } from '../models/stock-v2-workflow.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service des Bons d'entrée — Module Stock v2 / 7.4.
 *
 * CRUD (édition possible uniquement à l'état BROUILLON) + transitions du
 * workflow (soumission, validation, refus). L'auteur de chaque action est
 * déduit du JWT côté serveur. La validation génère les mouvements de stock
 * (type ENTREE) et bascule le bon en EFFECTIF.
 */
@Injectable({ providedIn: 'root' })
export class StockV2BonEntreeService {

  private baseUrl = `${environment.apiUrl}/stock/bons-entree`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreBonEntree,
  ): Observable<PageResponse<BonEntree>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.type) params = params.set('type', filtres.type);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    return this.http.get<PageResponse<BonEntree>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<BonEntree> {
    return this.http.get<BonEntree>(`${this.baseUrl}/${id}`);
  }

  creer(payload: BonEntreePayload): Observable<BonEntree> {
    return this.http.post<BonEntree>(this.baseUrl, payload);
  }

  modifier(id: string, payload: BonEntreePayload): Observable<BonEntree> {
    return this.http.put<BonEntree>(`${this.baseUrl}/${id}`, payload);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Supprime un bon **quel que soit son statut** — SUPERADMIN uniquement (403 sinon).
   *
   * ⚠ Sur un bon EFFECTIF, le serveur **contre-passe** les mouvements d'entrée (la marchandise
   * reçue est retirée du stock) — **422 si elle a déjà été consommée** — puis efface le bon et
   * journalise l'opération. Le coût courant du produit (CUMP) n'est pas recalculé en arrière.
   */
  supprimerDefinitivement(id: string, motif: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/suppression-definitive`, { motif });
  }

  // ─── Transitions workflow ─────────────────────────────────────────────────

  soumettre(id: string): Observable<BonEntree> {
    return this.http.post<BonEntree>(`${this.baseUrl}/${id}/soumettre`, {});
  }

  valider(id: string, payload?: DecisionWorkflowPayload): Observable<BonEntree> {
    return this.http.post<BonEntree>(`${this.baseUrl}/${id}/valider`, payload ?? {});
  }

  refuser(id: string, payload: DecisionWorkflowPayload): Observable<BonEntree> {
    return this.http.post<BonEntree>(`${this.baseUrl}/${id}/refuser`, payload);
  }
}
