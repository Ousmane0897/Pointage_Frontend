import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DossierEmploye, FiltreEmploye } from '../models/dossier-employe.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service CRUD pour les dossiers employés – Gestion du Personnel
 */
@Injectable({ providedIn: 'root' })
export class DossierEmployeService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Récupère la liste paginée des employés avec recherche et filtres
   */
  getEmployes(
    page = 0,
    size = 10,
    filtres?: FiltreEmploye
  ): Observable<PageResponse<DossierEmploye>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.departement) params = params.set('departement', filtres.departement);
    if (filtres?.site) params = params.set('site', filtres.site);
    if (filtres?.poste) params = params.set('poste', filtres.poste);
    if (filtres?.statut) params = params.set('statut', filtres.statut);

    return this.http.get<PageResponse<DossierEmploye>>(
      `${this.baseUrl}/gestion-personnel/employes`,
      { params }
    );
  }

  /**
   * Récupère un employé par son identifiant
   */
  getEmployeById(id: string): Observable<DossierEmploye> {
    return this.http.get<DossierEmploye>(
      `${this.baseUrl}/gestion-personnel/employes/${id}`
    );
  }

  /**
   * Crée un nouvel employé (avec photo en FormData)
   */
  creerEmploye(formData: FormData): Observable<DossierEmploye> {
    return this.http.post<DossierEmploye>(
      `${this.baseUrl}/gestion-personnel/employes`,
      formData
    );
  }

  /**
   * Met à jour un employé existant
   */
  modifierEmploye(id: string, formData: FormData): Observable<DossierEmploye> {
    return this.http.put<DossierEmploye>(
      `${this.baseUrl}/gestion-personnel/employes/${id}`,
      formData
    );
  }

  /**
   * Supprime un employé
   */
  supprimerEmploye(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/gestion-personnel/employes/${id}`
    );
  }

  /**
   * Récupère la liste des départements disponibles
   */
  getDepartements(): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.baseUrl}/gestion-personnel/employes/departements`
    );
  }

  /**
   * Récupère la liste des sites disponibles
   */
  getSites(): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.baseUrl}/gestion-personnel/employes/sites`
    );
  }

  /**
   * Récupère la liste des postes disponibles
   */
  getPostes(): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.baseUrl}/gestion-personnel/employes/postes`
    );
  }
}
