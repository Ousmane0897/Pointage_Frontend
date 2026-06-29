import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ComparatifCoutSites, FiltreCoutSite } from '../models/stock-v2-cout-site.model';

/**
 * Service Coût de consommation par site — Module Stock v2 / 7.6 (fonctionnalité 4).
 *
 * Agrégation serveur des sorties EFFECTIVES valorisées par site, avec détection
 * des surconsommations (vs moyenne inter-sites ou N-1).
 */
@Injectable({ providedIn: 'root' })
export class StockV2CoutSiteService {

  private baseUrl = `${environment.apiUrl}/stock/valorisation`;

  constructor(private http: HttpClient) {}

  getComparatif(filtres: FiltreCoutSite): Observable<ComparatifCoutSites> {
    let params = new HttpParams()
      .set('dateDebut', filtres.dateDebut)
      .set('dateFin', filtres.dateFin);
    if (filtres.categorieId) params = params.set('categorieId', filtres.categorieId);
    return this.http.get<ComparatifCoutSites>(`${this.baseUrl}/cout-site`, { params });
  }
}
