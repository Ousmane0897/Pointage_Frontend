import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Contrat, Avenant, Renouvellement, AlerteContrat } from '../models/contrat.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service pour la gestion des contrats de travail – Gestion du Personnel
 */
@Injectable({ providedIn: 'root' })
export class ContratService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── Contrats ───────────────────────────────────────────

  /**
   * Liste paginée des contrats avec recherche
   */
  getContrats(page = 0, size = 10, q = '', typeContrat?: string): Observable<PageResponse<Contrat>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (q) params = params.set('q', q);
    if (typeContrat) params = params.set('typeContrat', typeContrat);

    return this.http.get<PageResponse<Contrat>>(
      `${this.baseUrl}/gestion-personnel/contrats`,
      { params }
    );
  }

  /**
   * Récupère un contrat par son identifiant
   */
  getContratById(id: string): Observable<Contrat> {
    return this.http.get<Contrat>(
      `${this.baseUrl}/gestion-personnel/contrats/${id}`
    );
  }

  /**
   * Récupère les contrats d'un employé
   */
  getContratsByEmploye(employeId: string): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(
      `${this.baseUrl}/gestion-personnel/contrats/employe/${employeId}`
    );
  }

  /**
   * Crée un nouveau contrat (FormData : contrat JSON + fichier optionnel).
   */
  creerContrat(formData: FormData): Observable<Contrat> {
    return this.http.post<Contrat>(
      `${this.baseUrl}/gestion-personnel/contrats`,
      formData
    );
  }

  /**
   * Met à jour un contrat (FormData : contrat JSON + fichier optionnel).
   */
  modifierContrat(id: string, formData: FormData): Observable<Contrat> {
    return this.http.put<Contrat>(
      `${this.baseUrl}/gestion-personnel/contrats/${id}`,
      formData
    );
  }

  /**
   * Supprime un contrat
   */
  supprimerContrat(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/gestion-personnel/contrats/${id}`
    );
  }

  /**
   * Télécharge le fichier du contrat (PDF/DOC/DOCX).
   */
  telechargerContrat(id: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/gestion-personnel/contrats/${id}/fichier`,
      { responseType: 'blob' }
    );
  }

  /**
   * Supprime uniquement le fichier attaché au contrat (le contrat reste).
   */
  supprimerFichierContrat(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/gestion-personnel/contrats/${id}/fichier`
    );
  }

  // ─── Renouvellements ────────────────────────────────────

  /**
   * Renouvelle un contrat (CDD / Stage)
   */
  renouvelerContrat(contratId: string, renouvellement: Renouvellement): Observable<Renouvellement> {
    return this.http.post<Renouvellement>(
      `${this.baseUrl}/gestion-personnel/contrats/${contratId}/renouveler`,
      renouvellement
    );
  }

  /**
   * Historique des renouvellements d'un contrat
   */
  getRenouvellements(contratId: string): Observable<Renouvellement[]> {
    return this.http.get<Renouvellement[]>(
      `${this.baseUrl}/gestion-personnel/contrats/${contratId}/renouvellements`
    );
  }

  // ─── Avenants ───────────────────────────────────────────

  /**
   * Liste des avenants d'un contrat
   */
  getAvenants(contratId: string): Observable<Avenant[]> {
    return this.http.get<Avenant[]>(
      `${this.baseUrl}/gestion-personnel/contrats/${contratId}/avenants`
    );
  }

  /**
   * Crée un avenant pour un contrat
   */
  creerAvenant(contratId: string, avenant: Avenant): Observable<Avenant> {
    return this.http.post<Avenant>(
      `${this.baseUrl}/gestion-personnel/contrats/${contratId}/avenants`,
      avenant
    );
  }

  /**
   * Supprime un avenant
   */
  supprimerAvenant(contratId: string, avenantId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/gestion-personnel/contrats/${contratId}/avenants/${avenantId}`
    );
  }

  // ─── Alertes ────────────────────────────────────────────

  /**
   * Récupère les alertes de contrats arrivant à échéance
   */
  getAlertes(): Observable<AlerteContrat[]> {
    return this.http.get<AlerteContrat[]>(
      `${this.baseUrl}/gestion-personnel/contrats/alertes`
    );
  }
}
