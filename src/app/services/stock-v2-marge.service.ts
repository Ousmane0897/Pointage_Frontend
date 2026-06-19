import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FiltreMarge, SyntheseMarges } from '../models/stock-v2-marge.model';
import { PARAMETRES_VALORISATION } from '../constants/stock-v2-valorisation.constants';

/**
 * Service de marge — Module Stock v2 / 7.6 (fonctionnalité 6).
 *
 * Partie CALCUL : méthodes pures testables (marge unitaire/globale, taux,
 * rentabilité). Partie HTTP : récupération de la synthèse agrégée serveur.
 */
@Injectable({ providedIn: 'root' })
export class StockV2MargeService {

  private baseUrl = `${environment.apiUrl}/stock/valorisation`;

  constructor(private http: HttpClient) {}

  // ─── Calculs purs (testables) ─────────────────────────────────────────────

  /** Marge unitaire = prix de vente − coût de revient (FCFA). */
  margeUnitaire(prixVente: number, coutRevient: number): number {
    return Math.round(prixVente - coutRevient);
  }

  /** Marge globale = marge unitaire × quantité vendue (FCFA). */
  margeGlobale(prixVente: number, coutRevient: number, quantiteVendue: number): number {
    return Math.round(this.margeUnitaire(prixVente, coutRevient) * Math.max(quantiteVendue, 0));
  }

  /** Taux de marge (%) = marge unitaire / prix de vente × 100. 0 si prix de vente nul. */
  tauxMarge(prixVente: number, coutRevient: number): number {
    if (prixVente <= 0) return 0;
    return (this.margeUnitaire(prixVente, coutRevient) / prixVente) * 100;
  }

  /**
   * Rentabilité : faux si marge négative OU taux de marge sous le seuil paramétré
   * (`PARAMETRES_VALORISATION.seuilMargeMinPct`).
   */
  estRentable(prixVente: number, coutRevient: number, seuilPct = PARAMETRES_VALORISATION.seuilMargeMinPct): boolean {
    if (this.margeUnitaire(prixVente, coutRevient) < 0) return false;
    return this.tauxMarge(prixVente, coutRevient) >= seuilPct;
  }

  // ─── HTTP (agrégation serveur) ────────────────────────────────────────────

  getSyntheseMarges(filtres: FiltreMarge): Observable<SyntheseMarges> {
    let params = new HttpParams()
      .set('dateDebut', filtres.dateDebut)
      .set('dateFin', filtres.dateFin);
    if (filtres.categorieId) params = params.set('categorieId', filtres.categorieId);
    return this.http.get<SyntheseMarges>(`${this.baseUrl}/marges`, { params });
  }
}
