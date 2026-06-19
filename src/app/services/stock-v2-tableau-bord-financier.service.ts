import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FiltreTableauBordFinancier,
  RapportTableauBordFinancier,
} from '../models/stock-v2-tableau-bord-financier.model';

/**
 * Service Tableau de bord financier — Module Stock v2 / 7.6 (fonctionnalité 7).
 *
 * Agrège valeur du stock, consommation, coûts par site, marges et dérives
 * budgétaires en un rapport unique (calculs serveur).
 */
@Injectable({ providedIn: 'root' })
export class StockV2TableauBordFinancierService {

  private baseUrl = `${environment.apiUrl}/stock/valorisation`;

  constructor(private http: HttpClient) {}

  getRapport(filtres: FiltreTableauBordFinancier): Observable<RapportTableauBordFinancier> {
    let params = new HttpParams()
      .set('dateDebut', filtres.dateDebut)
      .set('dateFin', filtres.dateFin);
    if (filtres.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres.categorieId) params = params.set('categorieId', filtres.categorieId);
    return this.http.get<RapportTableauBordFinancier>(`${this.baseUrl}/tableau-bord`, { params });
  }
}
