import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FiltreAnalyseDon,
  SyntheseDons,
} from '../models/stock-v2-analyse-don.model';

/**
 * Service d'agrégation — 7.5 Consommations dons.
 *
 * LECTURE SEULE : agrège côté serveur les sorties de type `DON` (7.4) valorisées
 * via le catalogue de 7.3, par nature de don et par bénéficiaire.
 */
@Injectable({ providedIn: 'root' })
export class StockV2AnalyseDonService {

  private baseUrl = `${environment.apiUrl}/stock/analyse`;

  constructor(private http: HttpClient) {}

  /** Synthèse des dons (KPIs + lignes + répartition + top + évolution). */
  getSynthese(filtres: FiltreAnalyseDon): Observable<SyntheseDons> {
    let params = new HttpParams()
      .set('dateDebut', filtres.dateDebut)
      .set('dateFin', filtres.dateFin);
    if (filtres.natureDon) params = params.set('natureDon', filtres.natureDon);
    if (filtres.beneficiaire) params = params.set('beneficiaire', filtres.beneficiaire);
    if (filtres.siteId) params = params.set('siteId', filtres.siteId);
    return this.http.get<SyntheseDons>(`${this.baseUrl}/dons`, { params });
  }
}
