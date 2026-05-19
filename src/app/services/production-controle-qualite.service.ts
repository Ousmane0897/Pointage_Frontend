import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  GrilleControle,
  ControleQualite,
  FiltreControle,
  TendanceParametre,
} from '../models/production-controle-qualite.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service de gestion du Contrôle Qualité Production — Module Production
 * Chimie (5.1).
 */
@Injectable({ providedIn: 'root' })
export class ProductionControleQualiteService {

  private baseUrl = `${environment.apiUrl}/production-chimie/controle-qualite`;

  constructor(private http: HttpClient) {}

  // ─── Grilles de contrôle ────────────────────────────────────────────────

  listerGrilles(): Observable<GrilleControle[]> {
    return this.http.get<GrilleControle[]>(`${this.baseUrl}/grilles`);
  }

  getGrille(id: string): Observable<GrilleControle> {
    return this.http.get<GrilleControle>(`${this.baseUrl}/grilles/${id}`);
  }

  /** Récupère la grille associée à un produit/formulation, si elle existe. */
  getGrillePourLot(lotId: string): Observable<GrilleControle | null> {
    return this.http.get<GrilleControle | null>(`${this.baseUrl}/grilles/pour-lot/${lotId}`);
  }

  creerGrille(grille: GrilleControle): Observable<GrilleControle> {
    return this.http.post<GrilleControle>(`${this.baseUrl}/grilles`, grille);
  }

  modifierGrille(id: string, grille: GrilleControle): Observable<GrilleControle> {
    return this.http.put<GrilleControle>(`${this.baseUrl}/grilles/${id}`, grille);
  }

  supprimerGrille(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/grilles/${id}`);
  }

  // ─── Contrôles ──────────────────────────────────────────────────────────

  listerControles(
    page = 0,
    size = 20,
    filtres?: FiltreControle,
  ): Observable<PageResponse<ControleQualite>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (filtres?.lotId) params = params.set('lotId', filtres.lotId);
    if (filtres?.produitNom) params = params.set('produitNom', filtres.produitNom);
    if (filtres?.decision) params = params.set('decision', filtres.decision);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    return this.http.get<PageResponse<ControleQualite>>(`${this.baseUrl}/controles`, { params });
  }

  getControle(id: string): Observable<ControleQualite> {
    return this.http.get<ControleQualite>(`${this.baseUrl}/controles/${id}`);
  }

  /** Création d'un contrôle (FormData = JSON + photos). */
  creerControle(formData: FormData): Observable<ControleQualite> {
    return this.http.post<ControleQualite>(`${this.baseUrl}/controles`, formData);
  }

  /** Tendances des paramètres d'un produit sur les N derniers contrôles. */
  getTendances(produitNom: string, nbPoints = 10): Observable<TendanceParametre[]> {
    const params = new HttpParams().set('produitNom', produitNom).set('nbPoints', nbPoints);
    return this.http.get<TendanceParametre[]>(`${this.baseUrl}/tendances`, { params });
  }
}
