import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageResponse } from '../models/pageResponse.model';
import {
  CoutProduit,
  FiltreCoutMouvement,
  FiltreCoutProduit,
  FiltreValeurStock,
  HistoriqueCoutProduit,
  LigneCoutMouvement,
  MethodeValorisation,
  ParametrageValorisation,
  ParametrageValorisationPayload,
  ValeurStock,
} from '../models/stock-v2-valorisation.model';
import { PARAMETRES_VALORISATION } from '../constants/stock-v2-valorisation.constants';

/**
 * Service de valorisation financière — Module Stock v2 / 7.6.
 *
 * Couvre le paramétrage global (1), les coûts produits + historique (1), les coûts
 * de mouvements valorisés (2) et la valeur du stock temps réel (3). Les calculs
 * lourds sont exécutés côté serveur ; ce service est essentiellement HTTP, complété
 * de quelques helpers purs (classification des dérives).
 */
@Injectable({ providedIn: 'root' })
export class StockV2ValorisationService {

  private baseUrl = `${environment.apiUrl}/stock/valorisation`;
  private produitsUrl = `${environment.apiUrl}/stock/produits`;

  constructor(private http: HttpClient) {}

  // ─── Paramétrage global ───────────────────────────────────────────────────

  getParametrage(): Observable<ParametrageValorisation> {
    return this.http.get<ParametrageValorisation>(`${this.baseUrl}/parametrage`);
  }

  setParametrage(payload: ParametrageValorisationPayload): Observable<ParametrageValorisation> {
    return this.http.put<ParametrageValorisation>(`${this.baseUrl}/parametrage`, payload);
  }

  // ─── Coûts par produit ────────────────────────────────────────────────────

  listerCoutsProduits(
    page = 0,
    size = PARAMETRES_VALORISATION.pageSize,
    filtres?: FiltreCoutProduit,
  ): Observable<PageResponse<CoutProduit>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.typeProduit) params = params.set('typeProduit', filtres.typeProduit);
    if (filtres?.categorieId) params = params.set('categorieId', filtres.categorieId);
    if (filtres?.methode) params = params.set('methode', filtres.methode);
    if (filtres?.avecAlerte) params = params.set('avecAlerte', true);
    return this.http.get<PageResponse<CoutProduit>>(`${this.baseUrl}/couts-produits`, { params });
  }

  getHistoriqueCout(produitId: string): Observable<HistoriqueCoutProduit> {
    return this.http.get<HistoriqueCoutProduit>(`${this.baseUrl}/couts-produits/${produitId}/historique`);
  }

  /** Override de la méthode de valorisation d'un produit (endpoint dédié — pas le formulaire 7.3). */
  setMethodeProduit(produitId: string, methodeValorisation: MethodeValorisation): Observable<void> {
    return this.http.patch<void>(`${this.produitsUrl}/${produitId}/valorisation`, { methodeValorisation });
  }

  /** Définit le prix de vente d'un produit (endpoint dédié — pas le formulaire 7.3). */
  setPrixVente(produitId: string, prixVente: number): Observable<void> {
    return this.http.patch<void>(`${this.produitsUrl}/${produitId}/prix-vente`, { prixVente });
  }

  // ─── Coûts de mouvements valorisés ────────────────────────────────────────

  listerCoutsMouvements(
    page = 0,
    size = PARAMETRES_VALORISATION.pageSize,
    filtres?: FiltreCoutMouvement,
  ): Observable<PageResponse<LigneCoutMouvement>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.produitId) params = params.set('produitId', filtres.produitId);
    if (filtres?.type) params = params.set('type', filtres.type);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    return this.http.get<PageResponse<LigneCoutMouvement>>(`${this.baseUrl}/mouvements`, { params });
  }

  // ─── Valeur du stock temps réel ───────────────────────────────────────────

  getValeurStock(filtres?: FiltreValeurStock): Observable<ValeurStock> {
    let params = new HttpParams();
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.categorieId) params = params.set('categorieId', filtres.categorieId);
    if (filtres?.comparer) params = params.set('comparer', filtres.comparer);
    return this.http.get<ValeurStock>(`${this.baseUrl}/valeur-stock`, { params });
  }

  // ─── Helper pur : gravité d'une dérive selon le seuil paramétré ───────────

  /** CRITIQUE au-delà de 2× le seuil, ATTENTION au-delà du seuil, sinon null. */
  classerDerive(ecartPct: number): 'CRITIQUE' | 'ATTENTION' | null {
    const seuil = PARAMETRES_VALORISATION.seuilDeriveBudgetPct;
    const abs = Math.abs(ecartPct);
    if (abs >= seuil * 2) return 'CRITIQUE';
    if (abs >= seuil) return 'ATTENTION';
    return null;
  }
}
