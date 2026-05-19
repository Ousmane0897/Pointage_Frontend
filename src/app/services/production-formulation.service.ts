import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FicheFormulation,
  FiltreFormulation,
  ComparaisonVersions,
} from '../models/production-formulation.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service de gestion des fiches de formulation (recettes produits chimiques)
 * — Module Production Chimie (5.1).
 *
 * Versioning : à chaque PUT, le backend snapshot la version précédente dans
 * le tableau versions[] embarqué du document.
 */
@Injectable({ providedIn: 'root' })
export class ProductionFormulationService {

  private baseUrl = `${environment.apiUrl}/production-chimie/formulations`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreFormulation,
  ): Observable<PageResponse<FicheFormulation>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    return this.http.get<PageResponse<FicheFormulation>>(this.baseUrl, { params });
  }

  listerValidees(): Observable<FicheFormulation[]> {
    return this.http.get<FicheFormulation[]>(`${this.baseUrl}/validees`);
  }

  getById(id: string): Observable<FicheFormulation> {
    return this.http.get<FicheFormulation>(`${this.baseUrl}/${id}`);
  }

  creer(formulation: FicheFormulation): Observable<FicheFormulation> {
    return this.http.post<FicheFormulation>(this.baseUrl, formulation);
  }

  modifier(id: string, formulation: FicheFormulation): Observable<FicheFormulation> {
    return this.http.put<FicheFormulation>(`${this.baseUrl}/${id}`, formulation);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  restaurerVersion(id: string, numero: number, motif?: string): Observable<FicheFormulation> {
    return this.http.post<FicheFormulation>(
      `${this.baseUrl}/${id}/versions/${numero}/restaurer`,
      { motif },
    );
  }

  comparerVersions(id: string, v1: number, v2: number): Observable<ComparaisonVersions> {
    const params = new HttpParams().set('v1', v1).set('v2', v2);
    return this.http.get<ComparaisonVersions>(
      `${this.baseUrl}/${id}/versions/comparer`,
      { params },
    );
  }
}
