import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  OrdreFabrication,
  FiltreOf,
  DisponibiliteOf,
} from '../models/production-ordre-fabrication.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service de gestion des Ordres de Fabrication — Module Production Chimie (5.1).
 *
 * Workflow :
 *   EN_ATTENTE → EN_COURS → TERMINE (via /lancer puis /terminer)
 *   * → ANNULE  (via /annuler)
 */
@Injectable({ providedIn: 'root' })
export class ProductionOrdreFabricationService {

  private baseUrl = `${environment.apiUrl}/production-chimie/ordres`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreOf,
  ): Observable<PageResponse<OrdreFabrication>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.operateurId) params = params.set('operateurId', filtres.operateurId);
    if (filtres?.formulationId) params = params.set('formulationId', filtres.formulationId);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    return this.http.get<PageResponse<OrdreFabrication>>(this.baseUrl, { params });
  }

  /** Renvoie tous les OF non terminés/annulés pour la vue Kanban. */
  getEnCoursOuAttente(): Observable<OrdreFabrication[]> {
    return this.http.get<OrdreFabrication[]>(`${this.baseUrl}/kanban`);
  }

  getById(id: string): Observable<OrdreFabrication> {
    return this.http.get<OrdreFabrication>(`${this.baseUrl}/${id}`);
  }

  creer(of: OrdreFabrication): Observable<OrdreFabrication> {
    return this.http.post<OrdreFabrication>(this.baseUrl, of);
  }

  modifier(id: string, of: OrdreFabrication): Observable<OrdreFabrication> {
    return this.http.put<OrdreFabrication>(`${this.baseUrl}/${id}`, of);
  }

  /** Vérification disponibilité MP avant lancement (peut être appelée sur un OF non encore créé via formulationId+quantite). */
  verifierDisponibilite(formulationId: string, quantiteCible: number): Observable<DisponibiliteOf> {
    const params = new HttpParams()
      .set('formulationId', formulationId)
      .set('quantiteCible', quantiteCible);
    return this.http.get<DisponibiliteOf>(`${this.baseUrl}/disponibilite-mp`, { params });
  }

  getDisponibilitePourOf(id: string): Observable<DisponibiliteOf> {
    return this.http.get<DisponibiliteOf>(`${this.baseUrl}/${id}/disponibilite-mp`);
  }

  // ─── Transitions de workflow ────────────────────────────────────────────

  lancer(id: string, commentaire?: string): Observable<OrdreFabrication> {
    return this.http.post<OrdreFabrication>(
      `${this.baseUrl}/${id}/lancer`,
      { commentaire },
    );
  }

  terminer(id: string, quantiteReelle: number, commentaire?: string): Observable<OrdreFabrication> {
    return this.http.post<OrdreFabrication>(
      `${this.baseUrl}/${id}/terminer`,
      { quantiteReelle, commentaire },
    );
  }

  annuler(id: string, motif: string): Observable<OrdreFabrication> {
    return this.http.post<OrdreFabrication>(
      `${this.baseUrl}/${id}/annuler`,
      { motif },
    );
  }
}
