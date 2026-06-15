import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SiteClient, FiltreSiteClient } from '../models/terrain-site-client.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service du Référentiel Sites Clients — Module Exploitation Terrain (5.2).
 */
@Injectable({ providedIn: 'root' })
export class TerrainSiteClientService {

  private baseUrl = `${environment.apiUrl}/terrain/sites-clients`;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreSiteClient,
  ): Observable<PageResponse<SiteClient>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.ville) params = params.set('ville', filtres.ville);
    if (filtres?.frequencePassage) params = params.set('frequencePassage', filtres.frequencePassage);
    if (filtres?.actif !== undefined) params = params.set('actif', filtres.actif);
    return this.http.get<PageResponse<SiteClient>>(this.baseUrl, { params });
  }

  /** Liste légère pour les autocompletes / sélecteurs (tous les sites actifs). */
  listerActifs(): Observable<SiteClient[]> {
    return this.http.get<SiteClient[]>(`${this.baseUrl}/actifs`);
  }

  getById(id: string): Observable<SiteClient> {
    return this.http.get<SiteClient>(`${this.baseUrl}/${id}`);
  }

  /** Création avec PDF cahier des charges éventuel (FormData = JSON + fichier). */
  creer(formData: FormData): Observable<SiteClient> {
    return this.http.post<SiteClient>(this.baseUrl, formData);
  }

  modifier(id: string, formData: FormData): Observable<SiteClient> {
    return this.http.put<SiteClient>(`${this.baseUrl}/${id}`, formData);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Téléchargement du PDF cahier des charges (endpoint protégé JWT). */
  getCahierDesCharges(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/cahier-charges`, {
      responseType: 'blob',
    });
  }
}
