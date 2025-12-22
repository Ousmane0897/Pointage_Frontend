import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { MouvementEntreeStock } from '../models/MouvementEntreeStock.model';
import { MouvementSortieStock, SortieStockBatch } from '../models/MouvementSortieStock.model';
import { Produit } from '../models/produit.model';

@Injectable({
  providedIn: 'root'
})
export class StockService {

  constructor(private http: HttpClient) { }

  private baseUrl = environment.apiUrlEmploye;

  // Méthode pour récupérer les entrées de stock
  getEntrees(): Observable<MouvementEntreeStock[]> {
    return this.http.get<MouvementEntreeStock[]>(`${this.baseUrl}/api/stock/entrees`);
  }

  // Méthode pour ajouter une nouvelle entrée de stock
  ajouterEntree(entree: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/stock/mouvement`, entree);
  }

  // Récupérer la liste des produits
  getProduits(): Observable<Produit[]> {
    return this.http.get<Produit[]>(`${this.baseUrl}/api/produits/all`);
  }

  // Récupérer le stock actuel d'un produit
  getStockProduit(produitId: string): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/api/stock/produit/quantite/${produitId}`);
  }


  sortieStock(mouvements: MouvementSortieStock[]): Observable<MouvementSortieStock[]> {
    return this.http.post<MouvementSortieStock[]>(`${this.baseUrl}/api/stock/sortie`, mouvements);
  }



  // --------------------------
  // SORTIES DE STOCK
  // --------------------------

  /**
   * Sortie simple : un seul produit
   */
  creerSortieSimple(sortie: MouvementSortieStock): Observable<MouvementSortieStock> {
    return this.http.post<MouvementSortieStock>(`${this.baseUrl}/api/stock/sortie/simple`, sortie);
  }

  /**
   * Sortie multiple (batch) : plusieurs produits, une seule destination/motif etc....
   */
  creerSortieBatch(batch: SortieStockBatch): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/stock/sorties/batch`, batch);
  }

  /**
   * Historique des sorties
   */
  getSorties(): Observable<MouvementSortieStock[]> {
    return this.http.get<MouvementSortieStock[]>(`${this.baseUrl}/api/stock/sorties`);
  }

  // --------------------------
  // SUIVI DE STOCK
  // --------------------------
  getSuiviStock(): Observable<Map<string, Object>[]> {
    return this.http.get<Map<string, Object>[]>(`${this.baseUrl}/api/stock/suivi`);
  }

}
