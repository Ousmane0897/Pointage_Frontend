import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FiltreTableauBordTerrain,
  KpiTerrain,
  InterventionsParSite,
  IncidentsParSite,
  SatisfactionParSite,
  ComparaisonPeriodesTerrain,
  RapportTableauBordTerrain,
  PointEvolution,
} from '../models/terrain-tableau-bord.model';

/**
 * Service du Tableau de Bord Exploitation Terrain — (5.2).
 *
 * Agrégations consommées par TableauBordTerrainComponent (KPIs + 4 charts).
 * Tous les calculs côté serveur ; le front se contente d'afficher.
 */
@Injectable({ providedIn: 'root' })
export class TerrainTableauBordService {

  private baseUrl = `${environment.apiUrl}/terrain/tableau-bord`;

  constructor(private http: HttpClient) {}

  getRapportComplet(filtre: FiltreTableauBordTerrain): Observable<RapportTableauBordTerrain> {
    return this.http.get<RapportTableauBordTerrain>(`${this.baseUrl}/rapport`, {
      params: this.params(filtre),
    });
  }

  getKpis(filtre: FiltreTableauBordTerrain): Observable<KpiTerrain> {
    return this.http.get<KpiTerrain>(`${this.baseUrl}/kpis`, { params: this.params(filtre) });
  }

  getInterventionsParSite(filtre: FiltreTableauBordTerrain): Observable<InterventionsParSite[]> {
    return this.http.get<InterventionsParSite[]>(
      `${this.baseUrl}/interventions-par-site`,
      { params: this.params(filtre) },
    );
  }

  getEvolutionCouverture(filtre: FiltreTableauBordTerrain): Observable<PointEvolution[]> {
    return this.http.get<PointEvolution[]>(`${this.baseUrl}/evolution-couverture`, {
      params: this.params(filtre),
    });
  }

  getIncidentsParSite(filtre: FiltreTableauBordTerrain): Observable<IncidentsParSite[]> {
    return this.http.get<IncidentsParSite[]>(`${this.baseUrl}/incidents-par-site`, {
      params: this.params(filtre),
    });
  }

  getEvolutionSatisfaction(filtre: FiltreTableauBordTerrain): Observable<PointEvolution[]> {
    return this.http.get<PointEvolution[]>(`${this.baseUrl}/evolution-satisfaction`, {
      params: this.params(filtre),
    });
  }

  getSatisfactionParSite(filtre: FiltreTableauBordTerrain): Observable<SatisfactionParSite[]> {
    return this.http.get<SatisfactionParSite[]>(`${this.baseUrl}/satisfaction-par-site`, {
      params: this.params(filtre),
    });
  }

  getComparaison(filtre: FiltreTableauBordTerrain): Observable<ComparaisonPeriodesTerrain> {
    return this.http.get<ComparaisonPeriodesTerrain>(`${this.baseUrl}/comparaison-periodes`, {
      params: this.params(filtre),
    });
  }

  private params(filtre: FiltreTableauBordTerrain): HttpParams {
    let p = new HttpParams()
      .set('dateDebut', filtre.dateDebut)
      .set('dateFin', filtre.dateFin);
    if (filtre.siteId) p = p.set('siteId', filtre.siteId);
    if (filtre.employeId) p = p.set('employeId', filtre.employeId);
    if (filtre.typeIntervention) p = p.set('typeIntervention', filtre.typeIntervention);
    return p;
  }
}
