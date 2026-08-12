import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EtatStock, SeuilPayload } from '../models/stock-v2-etat-stock.model';

/**
 * État de stock — Module Stock v2 / 7.3.
 *
 * L'écran « État du stock » a été supprimé : les quantités globales sont lues
 * depuis le catalogue produits (`quantiteTotale`) et les alertes depuis le
 * tableau de bord. Subsistent ici l'édition du seuil (table du catalogue) et la
 * lecture ciblée d'un couple produit/site, utilisée par le bon de sortie.
 */
@Injectable({ providedIn: 'root' })
export class StockV2EtatStockService {

  private baseUrl = `${environment.apiUrl}/stock/etat-stock`;

  constructor(private http: HttpClient) {}

  /** Mise à jour du seuil d'alerte (global produit si `siteId` omis, sinon couple produit/site). */
  majSeuil(payload: SeuilPayload): Observable<EtatStock> {
    return this.http.put<EtatStock>(`${this.baseUrl}/seuils`, payload);
  }

  /**
   * Stock d'un produit sur un site (`siteId` omis ⇒ consolidé tous sites).
   *
   * Renvoie `null` en cas d'erreur : un produit jamais mouvementé sur ce site
   * n'est pas une anomalie, et l'appelant affiche « — » plutôt qu'un faux zéro.
   */
  getEtatProduit(produitId: string, siteId?: string): Observable<EtatStock | null> {
    let params = new HttpParams();
    if (siteId) params = params.set('siteId', siteId);
    return this.http.get<EtatStock>(`${this.baseUrl}/produit/${produitId}`, { params })
      .pipe(catchError(() => of(null)));
  }
}
