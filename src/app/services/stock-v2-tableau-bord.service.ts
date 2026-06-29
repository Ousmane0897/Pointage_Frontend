import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  RapportTableauBordStock,
  FiltreTableauBordStock,
} from '../models/stock-v2-tableau-bord.model';

/**
 * Service du Tableau de bord stocks — Module Stock v2 / 7.3.
 *
 * Renvoie en un appel les KPIs et toutes les séries de graphiques pour la
 * période / le périmètre demandés.
 */
@Injectable({ providedIn: 'root' })
export class StockV2TableauBordService {

  private baseUrl = `${environment.apiUrl}/stock/tableau-bord`;

  constructor(private http: HttpClient) {}

  getRapport(filtres: FiltreTableauBordStock): Observable<RapportTableauBordStock> {
    let params = new HttpParams()
      .set('dateDebut', filtres.dateDebut)
      .set('dateFin', filtres.dateFin);
    if (filtres.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres.categorieId) params = params.set('categorieId', filtres.categorieId);
    if (filtres.moisDormance) params = params.set('moisDormance', filtres.moisDormance);
    return this.http.get<RapportTableauBordStock>(this.baseUrl, { params });
  }
}
