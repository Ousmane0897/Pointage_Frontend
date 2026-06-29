import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Produit, FiltreProduit } from '../models/stock-v2-produit.model';
import {
  ProduitBulkPayload,
  ResultatImport,
  BackendBulkImportResponse,
} from '../models/stock-v2-import.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service du Catalogue produits — Module Stock v2 / 7.3.
 *
 * Totalement indépendant de l'ancien stock et de la Production Chimie
 * (collection MongoDB dédiée `stock/produits`). Upload photo + fiche
 * technique via FormData (blob JSON `produit` + fichiers).
 */
@Injectable({ providedIn: 'root' })
export class StockV2ProduitService {

  private baseUrl = `${environment.apiUrl}/stock/produits`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreProduit,
  ): Observable<PageResponse<Produit>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.typeProduit) params = params.set('typeProduit', filtres.typeProduit);
    if (filtres?.categorieId) params = params.set('categorieId', filtres.categorieId);
    if (filtres?.fournisseur) params = params.set('fournisseur', filtres.fournisseur);
    if (filtres?.sousSeuil) params = params.set('sousSeuil', true);
    if (filtres?.actif !== undefined) params = params.set('actif', filtres.actif);
    return this.http.get<PageResponse<Produit>>(this.baseUrl, { params });
  }

  /** Liste légère pour les autocompletes / sélecteurs (tous les produits actifs). */
  listerActifs(): Observable<Produit[]> {
    return this.http.get<Produit[]>(`${this.baseUrl}/actifs`);
  }

  getById(id: string): Observable<Produit> {
    return this.http.get<Produit>(`${this.baseUrl}/${id}`);
  }

  /** Création avec photo + fiche technique éventuelles (FormData). */
  creer(formData: FormData): Observable<Produit> {
    return this.http.post<Produit>(this.baseUrl, formData);
  }

  modifier(id: string, formData: FormData): Observable<Produit> {
    return this.http.put<Produit>(`${this.baseUrl}/${id}`, formData);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Téléchargement de la fiche technique (endpoint protégé JWT). */
  telechargerFicheTechnique(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/fiche-technique`, { responseType: 'blob' });
  }

  /** Photo produit en blob (endpoint protégé JWT). */
  getPhotoBlob(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/photo`, { responseType: 'blob' });
  }

  /**
   * Import bulk transactionnel (all-or-nothing). Mappe la réponse backend
   * vers `ResultatImport` (succès + échecs ligne par ligne).
   */
  importerBulk(payload: ProduitBulkPayload): Observable<ResultatImport> {
    return this.http
      .post<BackendBulkImportResponse>(`${this.baseUrl}/bulk`, payload)
      .pipe(
        map(res => ({
          succes: res.inserted ?? 0,
          echecs: (res.errors ?? []).map(e => ({
            numeroLigne: e.numeroLigne ?? e.lineNumber ?? 0,
            code: e.code ?? '',
            message: e.message ?? 'Erreur inconnue.',
          })),
        })),
      );
  }
}
