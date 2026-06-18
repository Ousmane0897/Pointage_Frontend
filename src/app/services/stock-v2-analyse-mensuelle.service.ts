import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FiltreAnalyseMensuelle,
  SyntheseConsoMensuelle,
} from '../models/stock-v2-analyse-mensuelle.model';

/**
 * Service d'agrégation — 7.5 Vue mensuelle par agence/site.
 *
 * LECTURE SEULE : agrège côté serveur les sorties EFFECTIVES de 7.4 valorisées
 * via le catalogue de 7.3. Aucune écriture, aucune entité persistée.
 */
@Injectable({ providedIn: 'root' })
export class StockV2AnalyseMensuelleService {

  private baseUrl = `${environment.apiUrl}/stock/analyse`;

  constructor(private http: HttpClient) {}

  /** Synthèse de consommation mensuelle (KPIs + lignes + séries graphiques). */
  getSynthese(filtres: FiltreAnalyseMensuelle): Observable<SyntheseConsoMensuelle> {
    let params = new HttpParams().set('mois', filtres.mois);
    if (filtres.moisFin) params = params.set('moisFin', filtres.moisFin);
    if (filtres.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres.categorieId) params = params.set('categorieId', filtres.categorieId);
    return this.http.get<SyntheseConsoMensuelle>(`${this.baseUrl}/mensuel`, { params });
  }
}
