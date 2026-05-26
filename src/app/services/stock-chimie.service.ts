import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MatierePremiere,
  FiltreMatierePremiere,
} from '../models/production-matiere-premiere.model';
import {
  MouvementStockChimie,
  ReceptionMpPayload,
  AjustementMpPayload,
  FiltreMouvement,
} from '../models/production-mouvement-stock.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service dédié au stock chimie (matières premières + mouvements) du module
 * Production Chimie (5.1).
 *
 * IMPORTANT : ce service est TOTALEMENT INDÉPENDANT du module Stock existant
 * (stock.service.ts). Il consomme une collection MongoDB dédiée côté backend
 * (à confirmer en session backend ultérieure).
 */
@Injectable({ providedIn: 'root' })
export class StockChimieService {

  private baseUrl = `${environment.apiUrl}/production-chimie/stock-chimie`;

  constructor(private http: HttpClient) {}

  // ─── Matières premières — CRUD ──────────────────────────────────────────

  listerMatieres(
    page = 0,
    size = 20,
    filtres?: FiltreMatierePremiere,
  ): Observable<PageResponse<MatierePremiere>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.sousSeuilCritique !== undefined) {
      params = params.set('sousSeuilCritique', filtres.sousSeuilCritique);
    }
    if (filtres?.actif !== undefined) {
      params = params.set('actif', filtres.actif);
    }
    return this.http.get<PageResponse<MatierePremiere>>(
      `${this.baseUrl}/matieres-premieres`,
      { params },
    );
  }

  listerMatieresActives(): Observable<MatierePremiere[]> {
    return this.http.get<MatierePremiere[]>(
      `${this.baseUrl}/matieres-premieres/actives`,
    );
  }

  getMatiere(id: string): Observable<MatierePremiere> {
    return this.http.get<MatierePremiere>(
      `${this.baseUrl}/matieres-premieres/${id}`,
    );
  }

  creerMatiere(payload: FormData | MatierePremiere): Observable<MatierePremiere> {
    return this.http.post<MatierePremiere>(
      `${this.baseUrl}/matieres-premieres`,
      payload,
    );
  }

  modifierMatiere(
    id: string,
    payload: FormData | MatierePremiere,
  ): Observable<MatierePremiere> {
    return this.http.put<MatierePremiere>(
      `${this.baseUrl}/matieres-premieres/${id}`,
      payload,
    );
  }

  supprimerMatiere(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/matieres-premieres/${id}`,
    );
  }

  telechargerFicheSecurite(id: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/matieres-premieres/${id}/fiche-securite`,
      { responseType: 'blob' },
    );
  }

  supprimerFicheSecurite(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/matieres-premieres/${id}/fiche-securite`,
    );
  }

  matieresSousSeuil(): Observable<MatierePremiere[]> {
    return this.http.get<MatierePremiere[]>(
      `${this.baseUrl}/matieres-premieres/sous-seuil`,
    );
  }

  // ─── Mouvements de stock ────────────────────────────────────────────────

  listerMouvements(
    page = 0,
    size = 20,
    filtres?: FiltreMouvement,
  ): Observable<PageResponse<MouvementStockChimie>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (filtres?.matierePremiereId) {
      params = params.set('matierePremiereId', filtres.matierePremiereId);
    }
    if (filtres?.type) params = params.set('type', filtres.type);
    if (filtres?.ordreFabricationId) {
      params = params.set('ordreFabricationId', filtres.ordreFabricationId);
    }
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    return this.http.get<PageResponse<MouvementStockChimie>>(
      `${this.baseUrl}/mouvements`,
      { params },
    );
  }

  enregistrerReception(payload: ReceptionMpPayload): Observable<MouvementStockChimie> {
    return this.http.post<MouvementStockChimie>(
      `${this.baseUrl}/mouvements/reception`,
      payload,
    );
  }

  ajusterStock(payload: AjustementMpPayload): Observable<MouvementStockChimie> {
    return this.http.post<MouvementStockChimie>(
      `${this.baseUrl}/mouvements/ajustement`,
      payload,
    );
  }
}
