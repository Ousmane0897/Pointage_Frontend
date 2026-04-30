import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { DossierEmploye, FiltreEmploye } from '../models/dossier-employe.model';
import { PageResponse } from '../models/pageResponse.model';
import {
  BackendBulkImportResponse,
  DossierEmployeBulkPayload,
  EchecImport,
  ResultatImport,
} from '../models/import-employe.model';

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
   * Récupère la photo binaire de l'employé.
   * Le endpoint étant protégé par JWT, on passe par HttpClient (AuthInterceptor)
   * et on convertit ensuite le Blob en ObjectURL côté composant.
   */
  getPhotoBlob(id: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/gestion-personnel/employes/${id}/photo`,
      { responseType: 'blob' }
    );
  }

  /**
   * Récupère en un seul appel les valeurs distinctes (départements, sites, postes)
   * dérivées des employés en base. Utilisé pour peupler les dropdowns de filtres
   * (liste des employés) et le formulaire de création/édition.
   *
   * Le backend n'expose pas d'endpoints dédiés pour ces référentiels — on dérive
   * depuis la liste paginée. Pattern identique à `import-employe-excel.service.ts`.
   *
   * À privilégier sur `getDepartements/Sites/Postes()` quand on a besoin de plusieurs
   * listes : un seul aller-retour serveur au lieu de N.
   */
  getValeursFiltres(): Observable<{ departements: string[]; sites: string[]; postes: string[] }> {
    return this.getEmployes(0, 1000).pipe(
      map(page => {
        const employes = page.content ?? [];
        const distinctTrie = (vs: (string | undefined | null)[]) =>
          [...new Set(vs.filter((v): v is string => !!v && v.trim() !== ''))]
            .sort((a, b) => a.localeCompare(b, 'fr'));
        return {
          departements: distinctTrie(employes.map(e => e.departement)),
          sites: distinctTrie(employes.map(e => e.siteAffecte)),
          postes: distinctTrie(employes.map(e => e.poste)),
        };
      }),
    );
  }

  /**
   * Liste des départements distincts dérivée des employés. Délègue à `getValeursFiltres()`.
   * Préférer `getValeursFiltres()` si on a besoin aussi des sites/postes (1 appel au lieu de N).
   */
  getDepartements(): Observable<string[]> {
    return this.getValeursFiltres().pipe(map(v => v.departements));
  }

  /**
   * Liste des sites distincts dérivée des employés. Délègue à `getValeursFiltres()`.
   */
  getSites(): Observable<string[]> {
    return this.getValeursFiltres().pipe(map(v => v.sites));
  }

  /**
   * Liste des postes distincts dérivée des employés. Délègue à `getValeursFiltres()`.
   */
  getPostes(): Observable<string[]> {
    return this.getValeursFiltres().pipe(map(v => v.postes));
  }

  /**
   * Import bulk transactionnel (all-or-nothing) — consommé par la modale d'import Excel.
   * Le backend résout les supérieurs hiérarchiques par matricule (internes au batch + existants en base).
   * En cas d'échec d'une seule ligne, aucun employé n'est créé.
   *
   * Le backend renvoie {@link BackendBulkImportResponse} ({@code inserted}, {@code errors}, …) ;
   * on mappe vers {@link ResultatImport} ({@code succes}, {@code echecs}) consommé par l'UI.
   * Le HTTP 422 (TOUT_OU_RIEN avec erreurs) est intercepté et mappé de la même façon.
   */
  importerBulk(payload: DossierEmployeBulkPayload): Observable<ResultatImport> {
    return this.http
      .post<BackendBulkImportResponse>(
        `${this.baseUrl}/gestion-personnel/employes/bulk`,
        payload,
      )
      .pipe(
        map(corps => this.mapperReponseBulk(corps)),
        catchError((err: HttpErrorResponse) => {
          const corps = err.error;
          if (this.estReponseBulkBackend(corps)) {
            return of(this.mapperReponseBulk(corps));
          }
          return throwError(() => err);
        }),
      );
  }

  private estReponseBulkBackend(corps: unknown): corps is BackendBulkImportResponse {
    return (
      !!corps &&
      typeof corps === 'object' &&
      'inserted' in corps &&
      'errors' in corps &&
      Array.isArray((corps as { errors: unknown }).errors)
    );
  }

  private mapperReponseBulk(corps: BackendBulkImportResponse): ResultatImport {
    const echecs: EchecImport[] = (corps.errors ?? []).map(e => ({
      numeroLigne: e.numeroLigne ?? e.lineNumber ?? 0,
      matricule: e.matricule ?? '',
      message: e.message ?? 'Erreur serveur (détail manquant)',
    }));
    return { succes: corps.inserted ?? 0, echecs };
  }
}
