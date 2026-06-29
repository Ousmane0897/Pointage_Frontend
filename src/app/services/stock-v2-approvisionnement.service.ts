import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  SuggestionAppro,
  ParametresAppro,
} from '../models/stock-v2-approvisionnement.model';

/**
 * Service de l'Approvisionnement automatique — Module Stock v2 / 7.3.
 *
 * Calcule les suggestions de réapprovisionnement (seuil + consommation
 * moyenne sur N mois − stock actuel). La génération du bon de commande PDF
 * est assurée par `StockV2PdfService`.
 */
@Injectable({ providedIn: 'root' })
export class StockV2ApprovisionnementService {

  private baseUrl = `${environment.apiUrl}/stock/approvisionnement`;

  constructor(private http: HttpClient) {}

  getSuggestions(params: ParametresAppro): Observable<SuggestionAppro[]> {
    let httpParams = new HttpParams().set('nMois', params.nMois);
    if (params.siteId) httpParams = httpParams.set('siteId', params.siteId);
    if (params.categorieId) httpParams = httpParams.set('categorieId', params.categorieId);
    if (params.fournisseur) httpParams = httpParams.set('fournisseur', params.fournisseur);
    return this.http.get<SuggestionAppro[]>(`${this.baseUrl}/suggestions`, { params: httpParams });
  }
}
