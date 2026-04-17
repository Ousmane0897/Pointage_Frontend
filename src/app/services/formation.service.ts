import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageResponse } from '../models/pageResponse.model';
import {
  Formation,
  FiltreFormation,
  SessionFormation,
  FiltreSession,
  ParticipationFormation,
  EvaluationFormation,
  BesoinFormation,
  FiltreBesoinFormation,
  RecapBudgetFormation,
} from '../models/formation.model';

/**
 * Service CRUD du Plan de Formation – Développement RH.
 * Gère les formations, sessions, participations, évaluations post-formation
 * et besoins de formation.
 */
@Injectable({ providedIn: 'root' })
export class FormationService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── Formations ─────────────────────────────────────────────────

  lister(
    page = 0,
    size = 10,
    filtres?: FiltreFormation,
  ): Observable<PageResponse<Formation>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.actif !== undefined) params = params.set('actif', filtres.actif);

    return this.http.get<PageResponse<Formation>>(
      `${this.baseUrl}/developpement-rh/formations`,
      { params },
    );
  }

  getById(id: string): Observable<Formation> {
    return this.http.get<Formation>(
      `${this.baseUrl}/developpement-rh/formations/${id}`,
    );
  }

  creer(formation: Formation): Observable<Formation> {
    return this.http.post<Formation>(
      `${this.baseUrl}/developpement-rh/formations`,
      formation,
    );
  }

  modifier(id: string, formation: Formation): Observable<Formation> {
    return this.http.put<Formation>(
      `${this.baseUrl}/developpement-rh/formations/${id}`,
      formation,
    );
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/developpement-rh/formations/${id}`,
    );
  }

  // ─── Sessions ───────────────────────────────────────────────────

  listerSessions(
    page = 0,
    size = 10,
    filtres?: FiltreSession,
  ): Observable<PageResponse<SessionFormation>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filtres?.formationId) params = params.set('formationId', filtres.formationId);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.q) params = params.set('q', filtres.q);

    return this.http.get<PageResponse<SessionFormation>>(
      `${this.baseUrl}/developpement-rh/formations/sessions`,
      { params },
    );
  }

  getSessionById(id: string): Observable<SessionFormation> {
    return this.http.get<SessionFormation>(
      `${this.baseUrl}/developpement-rh/formations/sessions/${id}`,
    );
  }

  creerSession(session: SessionFormation): Observable<SessionFormation> {
    return this.http.post<SessionFormation>(
      `${this.baseUrl}/developpement-rh/formations/sessions`,
      session,
    );
  }

  modifierSession(id: string, session: SessionFormation): Observable<SessionFormation> {
    return this.http.put<SessionFormation>(
      `${this.baseUrl}/developpement-rh/formations/sessions/${id}`,
      session,
    );
  }

  annulerSession(id: string): Observable<SessionFormation> {
    return this.http.patch<SessionFormation>(
      `${this.baseUrl}/developpement-rh/formations/sessions/${id}/annuler`,
      {},
    );
  }

  // ─── Participations ─────────────────────────────────────────────

  inscrireParticipants(
    sessionId: string,
    employeIds: string[],
  ): Observable<ParticipationFormation[]> {
    return this.http.post<ParticipationFormation[]>(
      `${this.baseUrl}/developpement-rh/formations/sessions/${sessionId}/inscrire`,
      { employeIds },
    );
  }

  getParticipants(sessionId: string): Observable<ParticipationFormation[]> {
    return this.http.get<ParticipationFormation[]>(
      `${this.baseUrl}/developpement-rh/formations/sessions/${sessionId}/participants`,
    );
  }

  marquerPresence(
    participationId: string,
    present: boolean,
  ): Observable<ParticipationFormation> {
    return this.http.patch<ParticipationFormation>(
      `${this.baseUrl}/developpement-rh/formations/participations/${participationId}/presence`,
      { present },
    );
  }

  marquerCompletion(participationId: string): Observable<ParticipationFormation> {
    return this.http.patch<ParticipationFormation>(
      `${this.baseUrl}/developpement-rh/formations/participations/${participationId}/completion`,
      {},
    );
  }

  // ─── Évaluations post-formation ─────────────────────────────────

  evaluerFormation(evaluation: EvaluationFormation): Observable<EvaluationFormation> {
    return this.http.post<EvaluationFormation>(
      `${this.baseUrl}/developpement-rh/formations/evaluations`,
      evaluation,
    );
  }

  getEvaluationsSession(sessionId: string): Observable<EvaluationFormation[]> {
    const params = new HttpParams().set('sessionId', sessionId);
    return this.http.get<EvaluationFormation[]>(
      `${this.baseUrl}/developpement-rh/formations/evaluations`,
      { params },
    );
  }

  // ─── Besoins de formation ───────────────────────────────────────

  listerBesoins(
    page = 0,
    size = 10,
    filtres?: FiltreBesoinFormation,
  ): Observable<PageResponse<BesoinFormation>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filtres?.departement) params = params.set('departement', filtres.departement);
    if (filtres?.priorite) params = params.set('priorite', filtres.priorite);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.q) params = params.set('q', filtres.q);

    return this.http.get<PageResponse<BesoinFormation>>(
      `${this.baseUrl}/developpement-rh/formations/besoins`,
      { params },
    );
  }

  creerBesoin(besoin: BesoinFormation): Observable<BesoinFormation> {
    return this.http.post<BesoinFormation>(
      `${this.baseUrl}/developpement-rh/formations/besoins`,
      besoin,
    );
  }

  modifierBesoin(id: string, besoin: BesoinFormation): Observable<BesoinFormation> {
    return this.http.put<BesoinFormation>(
      `${this.baseUrl}/developpement-rh/formations/besoins/${id}`,
      besoin,
    );
  }

  supprimerBesoin(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/developpement-rh/formations/besoins/${id}`,
    );
  }

  // ─── Récapitulatif budget ───────────────────────────────────────

  getRecapBudget(annee: number): Observable<RecapBudgetFormation> {
    const params = new HttpParams().set('annee', annee);
    return this.http.get<RecapBudgetFormation>(
      `${this.baseUrl}/developpement-rh/formations/recap-budget`,
      { params },
    );
  }
}
