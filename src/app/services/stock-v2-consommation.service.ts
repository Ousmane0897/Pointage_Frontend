import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ConsommationDestinataire,
  FiltreConsommation,
  StatistiqueCategorie,
  SensCategorisation,
  RapportConsommation,
  FiltreRapportConsommation,
} from '../models/stock-v2-consommation.model';

/**
 * Service d'analyse de consommation — Module Stock v2 / 7.4.
 *
 * Couvre les statistiques d'usage des catégories (1 & 2), l'historique par
 * destinataire (6) et les rapports de consommation (9). Toutes les données
 * sont agrégées côté serveur depuis les mouvements EFFECTIFS.
 */
@Injectable({ providedIn: 'root' })
export class StockV2ConsommationService {

  private baseUrl = `${environment.apiUrl}/stock`;

  constructor(private http: HttpClient) {}

  /** Statistiques d'usage par catégorie d'entrée ou de sortie. */
  statistiquesCategorie(
    sens: SensCategorisation,
    dateDebut?: string,
    dateFin?: string,
  ): Observable<StatistiqueCategorie[]> {
    let params = new HttpParams().set('sens', sens);
    if (dateDebut) params = params.set('dateDebut', dateDebut);
    if (dateFin) params = params.set('dateFin', dateFin);
    return this.http.get<StatistiqueCategorie[]>(`${this.baseUrl}/categorisation/stats`, { params });
  }

  /** Historique de consommation cumulée par destinataire (site / agence / client). */
  parDestinataire(filtres?: FiltreConsommation): Observable<ConsommationDestinataire[]> {
    let params = new HttpParams();
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.produitId) params = params.set('produitId', filtres.produitId);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    return this.http.get<ConsommationDestinataire[]>(`${this.baseUrl}/consommation/par-destinataire`, { params });
  }

  /** Rapport de consommation détaillé (par site / produit / période). */
  rapport(filtres: FiltreRapportConsommation): Observable<RapportConsommation> {
    let params = new HttpParams()
      .set('type', filtres.type)
      .set('dateDebut', filtres.dateDebut)
      .set('dateFin', filtres.dateFin);
    if (filtres.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres.produitId) params = params.set('produitId', filtres.produitId);
    if (filtres.categorieId) params = params.set('categorieId', filtres.categorieId);
    return this.http.get<RapportConsommation>(`${this.baseUrl}/consommation/rapport`, { params });
  }
}
