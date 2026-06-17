import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  SyntheseMensuelle,
  FiltreSynthese,
} from '../models/stock-v2-synthese.model';

/**
 * Service de la Synthèse mensuelle — Module Stock v2 / 7.3.
 *
 * Agrège les mouvements d'un mois donné (stock initial / entrées / sorties /
 * stock final par produit) sur un périmètre site / catégorie.
 */
@Injectable({ providedIn: 'root' })
export class StockV2SyntheseService {

  private baseUrl = `${environment.apiUrl}/stock/synthese-mensuelle`;

  constructor(private http: HttpClient) {}

  getSynthese(filtres: FiltreSynthese): Observable<SyntheseMensuelle> {
    let params = new HttpParams().set('mois', filtres.mois);
    if (filtres.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres.categorieId) params = params.set('categorieId', filtres.categorieId);
    return this.http.get<SyntheseMensuelle>(this.baseUrl, { params });
  }
}
