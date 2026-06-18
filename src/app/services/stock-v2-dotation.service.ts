import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ComparatifDotation, FiltreDotation } from '../models/stock-v2-dotation.model';

/**
 * Service de la Dotation prévue vs réelle — Module Stock v2 / 7.4 (fonctionnalité 8).
 *
 * Compare la dotation planifiée (plafonds) à la distribution réellement
 * effectuée (sorties EFFECTIVES) pour un mois donné, par site et par produit.
 */
@Injectable({ providedIn: 'root' })
export class StockV2DotationService {

  private baseUrl = `${environment.apiUrl}/stock/dotation`;

  constructor(private http: HttpClient) {}

  comparatif(filtres: FiltreDotation): Observable<ComparatifDotation> {
    let params = new HttpParams().set('mois', filtres.mois);
    if (filtres.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres.produitId) params = params.set('produitId', filtres.produitId);
    return this.http.get<ComparatifDotation>(`${this.baseUrl}/comparatif`, { params });
  }
}
