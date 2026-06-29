import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageResponse } from '../models/pageResponse.model';
import {
  ChantierValorise,
  CoutRevientChantier,
  FiltreCoutChantier,
} from '../models/stock-v2-cout-chantier.model';
import { PARAMETRES_VALORISATION } from '../constants/stock-v2-valorisation.constants';

/**
 * Service Coût de revient par chantier — Module Stock v2 / 7.6 (fonctionnalité 5).
 *
 * Valorise au coût de revient les consommations rattachées aux chantiers (entité
 * 7.5, lecture seule). Aucune écriture sur l'entité Chantier depuis 7.6.
 */
@Injectable({ providedIn: 'root' })
export class StockV2CoutChantierService {

  private baseUrl = `${environment.apiUrl}/stock/valorisation/chantiers`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = PARAMETRES_VALORISATION.pageSize,
    filtres?: FiltreCoutChantier,
  ): Observable<PageResponse<ChantierValorise>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    return this.http.get<PageResponse<ChantierValorise>>(this.baseUrl, { params });
  }

  getDetail(id: string): Observable<CoutRevientChantier> {
    return this.http.get<CoutRevientChantier>(`${this.baseUrl}/${id}`);
  }
}
