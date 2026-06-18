import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FiltreComparatif,
  MatriceComparatif,
} from '../models/stock-v2-analyse-comparatif.model';

/**
 * Service d'agrégation — 7.5 Comparatif mensuel.
 *
 * LECTURE SEULE : le serveur calcule la matrice (site/produit × mois), les écarts
 * % vs mois précédent et le nombre de cellules en surconsommation selon le seuil.
 */
@Injectable({ providedIn: 'root' })
export class StockV2AnalyseComparatifService {

  private baseUrl = `${environment.apiUrl}/stock/analyse`;

  constructor(private http: HttpClient) {}

  /** Matrice comparative mensuelle avec détection des dérives. */
  getMatrice(filtres: FiltreComparatif): Observable<MatriceComparatif> {
    let params = new HttpParams()
      .set('axe', filtres.axe)
      .set('dateDebut', filtres.dateDebut)
      .set('dateFin', filtres.dateFin)
      .set('seuilPct', filtres.seuilPct);
    if (filtres.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres.categorieId) params = params.set('categorieId', filtres.categorieId);
    if (filtres.typeSortie) params = params.set('typeSortie', filtres.typeSortie);
    return this.http.get<MatriceComparatif>(`${this.baseUrl}/comparatif`, { params });
  }
}
