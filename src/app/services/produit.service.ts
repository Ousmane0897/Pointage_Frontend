import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Produit } from '../models/produit.model';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/pageResponse.model';

@Injectable({
  providedIn: 'root'
})
export class ProduitService {

  constructor(private http: HttpClient) { }

  private baseUrl = environment.apiUrl;


  /**
   * Récupère une liste paginée de produits avec une recherche optionnelle.
   * @param page Numéro de la page (par défaut 0)
   * @param size Taille de la page (par défaut 20)
   * @param q terme de recherche facultatif (par défaut vide, donc pas de recherche)
   * 🧩 Ces valeurs sont souvent passées dans l’URL de ton backend, par ex. :
      GET /products?page=0&size=20&q=chaise
   * HttpParams est une classe Angular qui sert à construire proprement les paramètres d’URL.
   *set('page', page) → ajoute ?page=0
   *set('size', size) → ajoute &size=20
   *if (q) → si q n’est pas vide, ajoute &q=valeur
   ➡️ Au final, si tu appelles :
    list(1, 10, 'chaise')
    👉 ça génère l’URL :
    /products?page=1&size=10&q=chaise
    En résumé: page, size, q Contrôlent la pagination et la recherche
   */

getProduits(
  page = 0,
  size = 15,
  q = '',
  categorie?: string,
  destination?: string
): Observable<PageResponse<Produit>> {

  let params = new HttpParams()
    .set('page', page)
    .set('size', size);

  if (q) params = params.set('q', q);
  if (categorie) params = params.set('categorie', categorie);
  if (destination) params = params.set('destination', destination);

  return this.http.get<PageResponse<Produit>>(
    `${this.baseUrl}/produits`,
    { params }
  );
}


getProduitById(id: string): Observable<Produit> {
  return this.http.get<Produit>(`${this.baseUrl}/produits/${id}`);
}

getAllProduits(): Observable<Produit[]> {
  return this.http.get<Produit[]>(`${this.baseUrl}/produits/all`);
}

createProduit(produit: any): Observable<any> {
  return this.http.post<any>(`${this.baseUrl}/produits`, produit);
}

filtrerProduitsByCategory(category: string): Observable<{content: Produit[], total?: number}> {
  let params = new HttpParams().set('category', category);
  return this.http.get<{content: Produit[], total?: number}>(`${this.baseUrl}/produits/categorie`, { params });
}

filtrerProduitsByDestination(destination: string): Observable<{content: Produit[], total?: number}> {
  let params = new HttpParams().set('destination', destination);
  return this.http.get<{content: Produit[], total?: number}>(`${this.baseUrl}/produits/destination`, { params });
}

getProduitByCode(codeProduit: string): Observable<Produit> {
  let params = new HttpParams().set('codeProduit', codeProduit);
  return this.http.get<Produit>(`${this.baseUrl}/produits/code`, { params });
}

getProduitByName(nomProduit: string): Observable<Produit> {
  let params = new HttpParams().set('nomProduit', nomProduit);
  return this.http.get<Produit>(`${this.baseUrl}/produits/nom`, { params });
}

/**
 * Met à jour partiellement un produit existant.
 * En TypeScript, le mot-clé Partial<T> est un type utilitaire intégré qui rend toutes les propriétés d’un type optionnelles.
 * Cela veut dire que le paramètre payload peut contenir seulement les champs que tu veux modifier, sans être obligé d’envoyer tout l’objet Produit
 * Partial<Produit> signifie que tu peux fournir seulement les champs que tu veux mettre à jour.
 */
updateProduit(id: string, payload: Partial<any>): Observable<any> {
  return this.http.put<any>(`${this.baseUrl}/produits/${id}`, payload);
}

getProduitImageUrl(id: string): Observable<{ imageUrl: string }> {
  return this.http.get<{ imageUrl: string }>(`${this.baseUrl}/produits/image/${id}`);
}

deleteProduit(id: string): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}/produits/${id}`);
}

}
