import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AffectationAgent,
  AnnulationAffectationPayload,
  ConflitAffectation,
  FiltrePlanning,
} from '../models/terrain-planning.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service du Planning des Équipes — Module Exploitation Terrain (5.2).
 */
@Injectable({ providedIn: 'root' })
export class TerrainPlanningService {

  private baseUrl = `${environment.apiUrl}/terrain/planning`;

  constructor(private http: HttpClient) {}

  // ─── Affectations ───────────────────────────────────────────────────────

  listerAffectations(
    page = 0,
    size = 50,
    filtres?: FiltrePlanning,
  ): Observable<PageResponse<AffectationAgent>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.employeId) params = params.set('employeId', filtres.employeId);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    return this.http.get<PageResponse<AffectationAgent>>(
      `${this.baseUrl}/affectations`,
      { params },
    );
  }

  /** Liste des affectations sur une fenêtre temporelle (vue calendrier). */
  listerAffectationsPeriode(
    dateDebut: string,
    dateFin: string,
    filtres?: Omit<FiltrePlanning, 'dateDebut' | 'dateFin'>,
  ): Observable<AffectationAgent[]> {
    let params = new HttpParams()
      .set('dateDebut', dateDebut)
      .set('dateFin', dateFin);
    if (filtres?.employeId) params = params.set('employeId', filtres.employeId);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    return this.http.get<AffectationAgent[]>(
      `${this.baseUrl}/affectations/periode`,
      { params },
    );
  }

  getAffectation(id: string): Observable<AffectationAgent> {
    return this.http.get<AffectationAgent>(`${this.baseUrl}/affectations/${id}`);
  }

  creerAffectation(affectation: AffectationAgent): Observable<AffectationAgent> {
    return this.http.post<AffectationAgent>(
      `${this.baseUrl}/affectations`,
      affectation,
    );
  }

  modifierAffectation(id: string, affectation: AffectationAgent): Observable<AffectationAgent> {
    return this.http.put<AffectationAgent>(
      `${this.baseUrl}/affectations/${id}`,
      affectation,
    );
  }

  /**
   * Annule une affectation en conservant la trace (motif obligatoire).
   * Le serveur passe le statut à ANNULEE, persiste motifAnnulation /
   * dateAnnulation / annuleParNom, et refuse (409/422) si le statut courant
   * n'est ni PLANIFIEE ni EN_COURS.
   */
  annulerAffectation(id: string, motif: string): Observable<AffectationAgent> {
    const payload: AnnulationAffectationPayload = { motif };
    return this.http.post<AffectationAgent>(
      `${this.baseUrl}/affectations/${id}/annuler`,
      payload,
    );
  }

  /** Détection serveur des conflits (un agent affecté à 2 sites se chevauchant). */
  detecterConflits(
    dateDebut: string,
    dateFin: string,
  ): Observable<ConflitAffectation[]> {
    const params = new HttpParams()
      .set('dateDebut', dateDebut)
      .set('dateFin', dateFin);
    return this.http.get<ConflitAffectation[]>(
      `${this.baseUrl}/affectations/conflits`,
      { params },
    );
  }
}
