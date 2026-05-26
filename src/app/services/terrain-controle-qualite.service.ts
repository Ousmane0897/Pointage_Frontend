import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  GrilleEvaluationTerrain,
  ControleQualiteTerrain,
  FiltreControleTerrain,
  EvolutionNotePoint,
} from '../models/terrain-controle-qualite.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service du Contrôle Qualité Terrain — Module Exploitation Terrain (5.2).
 */
@Injectable({ providedIn: 'root' })
export class TerrainControleQualiteService {

  private baseUrl = `${environment.apiUrl}/terrain/controles-terrain`;

  constructor(private http: HttpClient) {}

  // ─── Grilles d'évaluation ───────────────────────────────────────────────

  listerGrilles(): Observable<GrilleEvaluationTerrain[]> {
    return this.http.get<GrilleEvaluationTerrain[]>(`${this.baseUrl}/grilles`);
  }

  getGrille(id: string): Observable<GrilleEvaluationTerrain> {
    return this.http.get<GrilleEvaluationTerrain>(`${this.baseUrl}/grilles/${id}`);
  }

  /** Grille spécifique à un site (sinon grille générique). */
  getGrillePourSite(siteId: string): Observable<GrilleEvaluationTerrain | null> {
    return this.http.get<GrilleEvaluationTerrain | null>(
      `${this.baseUrl}/grilles/pour-site/${siteId}`,
    );
  }

  creerGrille(grille: GrilleEvaluationTerrain): Observable<GrilleEvaluationTerrain> {
    return this.http.post<GrilleEvaluationTerrain>(`${this.baseUrl}/grilles`, grille);
  }

  modifierGrille(id: string, grille: GrilleEvaluationTerrain): Observable<GrilleEvaluationTerrain> {
    return this.http.put<GrilleEvaluationTerrain>(`${this.baseUrl}/grilles/${id}`, grille);
  }

  supprimerGrille(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/grilles/${id}`);
  }

  // ─── Contrôles ──────────────────────────────────────────────────────────

  listerControles(
    page = 0,
    size = 20,
    filtres?: FiltreControleTerrain,
  ): Observable<PageResponse<ControleQualiteTerrain>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.decision) params = params.set('decision', filtres.decision);
    if (filtres?.controleurEmployeId) {
      params = params.set('controleurEmployeId', filtres.controleurEmployeId);
    }
    return this.http.get<PageResponse<ControleQualiteTerrain>>(this.baseUrl, { params });
  }

  getControle(id: string): Observable<ControleQualiteTerrain> {
    return this.http.get<ControleQualiteTerrain>(`${this.baseUrl}/${id}`);
  }

  /** Création avec photos en FormData. */
  creerControle(formData: FormData): Observable<ControleQualiteTerrain> {
    return this.http.post<ControleQualiteTerrain>(this.baseUrl, formData);
  }

  getPhoto(controleId: string, index: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${controleId}/photos/${index}`, {
      responseType: 'blob',
    });
  }

  /** Évolution des notes globales d'un site sur les N derniers contrôles. */
  historiqueNotesSite(
    siteId: string,
    nbPoints = 12,
  ): Observable<EvolutionNotePoint[]> {
    const params = new HttpParams().set('nbPoints', nbPoints);
    return this.http.get<EvolutionNotePoint[]>(
      `${this.baseUrl}/historique/${siteId}`,
      { params },
    );
  }
}
