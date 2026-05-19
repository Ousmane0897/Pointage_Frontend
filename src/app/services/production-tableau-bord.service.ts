import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FiltreTableauBord,
  KpiProductionPeriode,
  VolumeParProduit,
  EvolutionMensuelle,
  RendementProduit,
  RepartitionStatutCq,
  ComparaisonPeriodes,
  RapportTableauBord,
} from '../models/production-tableau-bord.model';

/**
 * Agrégations consommées par le Tableau de Bord Production — Module
 * Production Chimie (5.1).
 */
@Injectable({ providedIn: 'root' })
export class ProductionTableauBordService {

  private baseUrl = `${environment.apiUrl}/production-chimie/tableau-bord`;

  constructor(private http: HttpClient) {}

  getRapportComplet(filtre: FiltreTableauBord): Observable<RapportTableauBord> {
    return this.http.get<RapportTableauBord>(`${this.baseUrl}/rapport`, {
      params: this.params(filtre),
    });
  }

  getKpis(filtre: FiltreTableauBord): Observable<KpiProductionPeriode> {
    return this.http.get<KpiProductionPeriode>(`${this.baseUrl}/kpis`, { params: this.params(filtre) });
  }

  getVolumesParProduit(filtre: FiltreTableauBord): Observable<VolumeParProduit[]> {
    return this.http.get<VolumeParProduit[]>(`${this.baseUrl}/volumes-par-produit`, { params: this.params(filtre) });
  }

  getEvolutionMensuelle(filtre: FiltreTableauBord): Observable<EvolutionMensuelle[]> {
    return this.http.get<EvolutionMensuelle[]>(`${this.baseUrl}/evolution-mensuelle`, { params: this.params(filtre) });
  }

  getRendements(filtre: FiltreTableauBord): Observable<RendementProduit[]> {
    return this.http.get<RendementProduit[]>(`${this.baseUrl}/rendements`, { params: this.params(filtre) });
  }

  getRepartitionCq(filtre: FiltreTableauBord): Observable<RepartitionStatutCq> {
    return this.http.get<RepartitionStatutCq>(`${this.baseUrl}/repartition-cq`, { params: this.params(filtre) });
  }

  getComparaisonPeriodes(filtre: FiltreTableauBord): Observable<ComparaisonPeriodes> {
    return this.http.get<ComparaisonPeriodes>(`${this.baseUrl}/comparaison-periodes`, { params: this.params(filtre) });
  }

  private params(filtre: FiltreTableauBord): HttpParams {
    let p = new HttpParams()
      .set('dateDebut', filtre.dateDebut)
      .set('dateFin', filtre.dateFin);
    if (filtre.produitNom) p = p.set('produitNom', filtre.produitNom);
    if (filtre.operateurId) p = p.set('operateurId', filtre.operateurId);
    return p;
  }
}
