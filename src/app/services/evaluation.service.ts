import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageResponse } from '../models/pageResponse.model';
import {
  GrilleEvaluation,
  EvaluationPeriodique,
  FiltreEvaluation,
  NoteEvaluation,
} from '../models/evaluation.model';

/**
 * Service CRUD des évaluations périodiques – Développement RH.
 * Gère les grilles d'évaluation et le cycle d'évaluation :
 * BROUILLON → AUTO_EVALUATION → EVALUATION_MANAGER → VALIDE
 */
@Injectable({ providedIn: 'root' })
export class EvaluationService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── Grilles d'évaluation ──────────────────────────────────────

  listerGrilles(
    page = 0,
    size = 10,
    q?: string,
  ): Observable<PageResponse<GrilleEvaluation>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (q) params = params.set('q', q);

    return this.http.get<PageResponse<GrilleEvaluation>>(
      `${this.baseUrl}/developpement-rh/evaluations/grilles`,
      { params },
    );
  }

  getGrilleById(id: string): Observable<GrilleEvaluation> {
    return this.http.get<GrilleEvaluation>(
      `${this.baseUrl}/developpement-rh/evaluations/grilles/${id}`,
    );
  }

  creerGrille(grille: GrilleEvaluation): Observable<GrilleEvaluation> {
    return this.http.post<GrilleEvaluation>(
      `${this.baseUrl}/developpement-rh/evaluations/grilles`,
      grille,
    );
  }

  modifierGrille(id: string, grille: GrilleEvaluation): Observable<GrilleEvaluation> {
    return this.http.put<GrilleEvaluation>(
      `${this.baseUrl}/developpement-rh/evaluations/grilles/${id}`,
      grille,
    );
  }

  supprimerGrille(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/developpement-rh/evaluations/grilles/${id}`,
    );
  }

  // ─── Évaluations périodiques ────────────────────────────────────

  listerEvaluations(
    page = 0,
    size = 10,
    filtres?: FiltreEvaluation,
  ): Observable<PageResponse<EvaluationPeriodique>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filtres?.employeId) params = params.set('employeId', filtres.employeId);
    if (filtres?.departement) params = params.set('departement', filtres.departement);
    if (filtres?.periode) params = params.set('periode', filtres.periode);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.q) params = params.set('q', filtres.q);

    return this.http.get<PageResponse<EvaluationPeriodique>>(
      `${this.baseUrl}/developpement-rh/evaluations`,
      { params },
    );
  }

  getEvaluationById(id: string): Observable<EvaluationPeriodique> {
    return this.http.get<EvaluationPeriodique>(
      `${this.baseUrl}/developpement-rh/evaluations/${id}`,
    );
  }

  creerEvaluation(evaluation: EvaluationPeriodique): Observable<EvaluationPeriodique> {
    return this.http.post<EvaluationPeriodique>(
      `${this.baseUrl}/developpement-rh/evaluations`,
      evaluation,
    );
  }

  /**
   * Transition BROUILLON → AUTO_EVALUATION
   */
  soumettreAutoEvaluation(
    id: string,
    notes: NoteEvaluation[],
    commentaire: string,
  ): Observable<EvaluationPeriodique> {
    return this.http.patch<EvaluationPeriodique>(
      `${this.baseUrl}/developpement-rh/evaluations/${id}/auto-evaluation`,
      { notes, commentaire },
    );
  }

  /**
   * Transition AUTO_EVALUATION → EVALUATION_MANAGER
   */
  soumettreEvaluationManager(
    id: string,
    notes: NoteEvaluation[],
    commentaire: string,
    objectifs: string,
  ): Observable<EvaluationPeriodique> {
    return this.http.patch<EvaluationPeriodique>(
      `${this.baseUrl}/developpement-rh/evaluations/${id}/evaluation-manager`,
      { notes, commentaire, objectifs },
    );
  }

  /**
   * Transition EVALUATION_MANAGER → VALIDE
   */
  validerEvaluation(id: string): Observable<EvaluationPeriodique> {
    return this.http.patch<EvaluationPeriodique>(
      `${this.baseUrl}/developpement-rh/evaluations/${id}/valider`,
      {},
    );
  }

  /**
   * Historique des évaluations d'un employé (pour le graphique d'évolution).
   */
  getHistoriqueEmploye(employeId: string): Observable<EvaluationPeriodique[]> {
    return this.http.get<EvaluationPeriodique[]>(
      `${this.baseUrl}/developpement-rh/evaluations/employe/${employeId}`,
    );
  }
}
