import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CategorieStock,
  CategoriePayload,
} from '../models/stock-v2-categorie.model';

/**
 * Service des Catégories produits (arborescence) — Module Stock v2 / 7.3.
 *
 * Exploration paresseuse : `listerRacines()` puis `listerEnfants(parentId)`
 * à la demande (lazy expand de l'arbre).
 */
@Injectable({ providedIn: 'root' })
export class StockV2CategorieService {

  private baseUrl = `${environment.apiUrl}/stock/categories`;

  constructor(private http: HttpClient) {}

  /** Catégories de premier niveau (parentId null). */
  listerRacines(): Observable<CategorieStock[]> {
    return this.http.get<CategorieStock[]>(`${this.baseUrl}/racines`);
  }

  /** Catégories filles directes d'un nœud. */
  listerEnfants(parentId: string): Observable<CategorieStock[]> {
    const params = new HttpParams().set('parentId', parentId);
    return this.http.get<CategorieStock[]>(`${this.baseUrl}/enfants`, { params });
  }

  /** Liste plate de toutes les catégories (pour les selects de filtres). */
  listerToutes(): Observable<CategorieStock[]> {
    return this.http.get<CategorieStock[]>(this.baseUrl);
  }

  getById(id: string): Observable<CategorieStock> {
    return this.http.get<CategorieStock>(`${this.baseUrl}/${id}`);
  }

  creer(payload: CategoriePayload): Observable<CategorieStock> {
    return this.http.post<CategorieStock>(this.baseUrl, payload);
  }

  modifier(id: string, payload: CategoriePayload): Observable<CategorieStock> {
    return this.http.put<CategorieStock>(`${this.baseUrl}/${id}`, payload);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
