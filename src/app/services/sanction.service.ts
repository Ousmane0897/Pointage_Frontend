import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageResponse } from '../models/pageResponse.model';
import {
  Sanction,
  FiltreSanction,
  AlerteRecidive,
} from '../models/sanction.model';

/**
 * Service CRUD des sanctions & disciplinaire – Développement RH.
 * Gère le registre des sanctions, le respect de la procédure sénégalaise
 * et les alertes de récidive.
 */
@Injectable({ providedIn: 'root' })
export class SanctionService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── CRUD ───────────────────────────────────────────────────────

  lister(
    page = 0,
    size = 10,
    filtres?: FiltreSanction,
  ): Observable<PageResponse<Sanction>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filtres?.employeId) params = params.set('employeId', filtres.employeId);
    if (filtres?.type) params = params.set('type', filtres.type);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.departement) params = params.set('departement', filtres.departement);
    if (filtres?.q) params = params.set('q', filtres.q);

    return this.http.get<PageResponse<Sanction>>(
      `${this.baseUrl}/developpement-rh/sanctions`,
      { params },
    );
  }

  getById(id: string): Observable<Sanction> {
    return this.http.get<Sanction>(
      `${this.baseUrl}/developpement-rh/sanctions/${id}`,
    );
  }

  /**
   * Crée une sanction. Utilise FormData pour supporter l'upload de pièces jointes.
   */
  creer(formData: FormData): Observable<Sanction> {
    return this.http.post<Sanction>(
      `${this.baseUrl}/developpement-rh/sanctions`,
      formData,
    );
  }

  modifier(id: string, formData: FormData): Observable<Sanction> {
    return this.http.put<Sanction>(
      `${this.baseUrl}/developpement-rh/sanctions/${id}`,
      formData,
    );
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/developpement-rh/sanctions/${id}`,
    );
  }

  // ─── Workflow ───────────────────────────────────────────────────

  changerStatut(
    id: string,
    statut: string,
    commentaire?: string,
  ): Observable<Sanction> {
    return this.http.patch<Sanction>(
      `${this.baseUrl}/developpement-rh/sanctions/${id}/statut`,
      { statut, commentaire },
    );
  }

  // ─── Historique & alertes ───────────────────────────────────────

  getHistoriqueEmploye(employeId: string): Observable<Sanction[]> {
    return this.http.get<Sanction[]>(
      `${this.baseUrl}/developpement-rh/sanctions/employe/${employeId}`,
    );
  }

  getAlertesRecidive(): Observable<AlerteRecidive[]> {
    return this.http.get<AlerteRecidive[]>(
      `${this.baseUrl}/developpement-rh/sanctions/alertes-recidive`,
    );
  }

  // ─── Pièces jointes ─────────────────────────────────────────────

  uploadPieceJointe(sanctionId: string, fichier: File): Observable<Sanction> {
    const formData = new FormData();
    formData.append('fichier', fichier);
    return this.http.post<Sanction>(
      `${this.baseUrl}/developpement-rh/sanctions/${sanctionId}/pieces-jointes`,
      formData,
    );
  }
}
