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

  // ===================== RAPPORTS ET STATISTIQUES =====================

  // ==========================================================
  // 📦 Quantité d’un produit donné par mois pour chaque destination (année complète)
  // ==========================================================
  getQuantiteProduitParDestinationParMois(nomProduit: string, destination: string, annee: number): Observable<{ labels: string[], data: number[] }> {
    return this.http.get<{ labels: string[], data: number[] }>(`${this.baseUrl}/api/stock/stats/produit-destination-mois/${nomProduit}/${destination}/${annee}`);
  }

  // ==========================================================
  // 🍽️ Consommation par destination pour chaque mois d’une année
  // ==========================================================
  getConsommationParDestinationParMois(destination: string, annee: number): Observable<{ labels: string[], data: number[] }> {
    return this.http.get<{ labels: string[], data: number[] }>(`${this.baseUrl}/api/stock/stats/consommation-destination-mois/${destination}/${annee}`);
  }


  // 🍰 Graphe Pie
  getSortiesParDestination(mois: number, annee: number): Observable<{ labels: string[], data: number[] }> {
    return this.http.get<{ labels: string[], data: number[] }>(
      `${this.baseUrl}/api/stock/rapports/sorties-par-destination`,
      { params: { mois: mois.toString(), annee: annee.toString() } }
    );
  }

  /**
   * 
   *Dans une requête HTTP, les query params sont toujours envoyés sous forme de texte (string), même si dans ton backend tu les reçois en int.
    Donc on convertit les nombres en chaînes de caractères avant de les envoyer.
    Pourquoi ? Parce que les query parameters font partie de l’URL, et une URL est une chaîne de caractères.
   */

  // 📊 Graphe Bar
  getSortiesBarParDestination(mois: number, annee: number): Observable<{ labels: string[], datasets: any[] }> {
    return this.http.get<{ labels: string[], datasets: any[] }>(
      `${this.baseUrl}/api/stock/rapports/sorties-bar-par-destination`,
      { params: { mois: mois.toString(), annee: annee.toString() } }
    );
  }

  // 🏢 Classement des destinations par produit
  getClassementDestinationsParProduit(produit: string, mois: number, annee: number): Observable<{ labels: string[], datasets: any[] }> {
    return this.http.get<{ labels: string[], datasets: any[] }>(
      `${this.baseUrl}/api/stock/rapports/classement-destinations-produit`,
      { params: { produit, mois: mois.toString(), annee: annee.toString() } }
    );
  }
  // 📈 Consommation d’un produit donné sur une période définie
  getConsommationProduitParPeriode(
    produit: string,
    moisDebut: number,
    moisFin: number,
    annee: number
  ): Observable<{ labels: string[], datasets: any[] }> {
    return this.http.get<{ labels: string[], datasets: any[] }>(
      `${this.baseUrl}/api/stock/rapports/consommation-produit-periode`,
      {
        params: {
          produit,
          moisDebut: moisDebut.toString(),
          moisFin: moisFin.toString(),
          annee: annee.toString()
        }
      }
    );
  }







}
