import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FormatConditionnement,
  FiltreFormatConditionnement,
} from '../models/production-format-conditionnement.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service de gestion du référentiel des formats de conditionnement
 * (bouteilles, bidons, fûts, etc.) — Module Production Chimie (5.1).
 */
@Injectable({ providedIn: 'root' })
export class ProductionFormatConditionnementService {

  private baseUrl = `${environment.apiUrl}/production-chimie/formats-conditionnement`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreFormatConditionnement,
  ): Observable<PageResponse<FormatConditionnement>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.typeContenant) params = params.set('typeContenant', filtres.typeContenant);
    if (filtres?.actif !== undefined) params = params.set('actif', filtres.actif);
    return this.http.get<PageResponse<FormatConditionnement>>(this.baseUrl, { params });
  }

  listerActifs(): Observable<FormatConditionnement[]> {
    return this.http.get<FormatConditionnement[]>(`${this.baseUrl}/actifs`);
  }

  getById(id: string): Observable<FormatConditionnement> {
    return this.http.get<FormatConditionnement>(`${this.baseUrl}/${id}`);
  }

  creer(format: FormatConditionnement): Observable<FormatConditionnement> {
    return this.http.post<FormatConditionnement>(this.baseUrl, format);
  }

  modifier(id: string, format: FormatConditionnement): Observable<FormatConditionnement> {
    return this.http.put<FormatConditionnement>(`${this.baseUrl}/${id}`, format);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
