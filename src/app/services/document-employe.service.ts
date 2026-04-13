import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DocumentEmploye, CategorieDocument } from '../models/document-employe.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service pour la gestion des documents employé – Gestion du Personnel
 */
@Injectable({ providedIn: 'root' })
export class DocumentEmployeService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Liste paginée des documents avec filtres
   */
  getDocuments(
    page = 0,
    size = 10,
    employeId?: string,
    categorie?: CategorieDocument
  ): Observable<PageResponse<DocumentEmploye>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (employeId) params = params.set('employeId', employeId);
    if (categorie) params = params.set('categorie', categorie);

    return this.http.get<PageResponse<DocumentEmploye>>(
      `${this.baseUrl}/gestion-personnel/documents`,
      { params }
    );
  }

  /**
   * Récupère les documents d'un employé
   */
  getDocumentsByEmploye(employeId: string): Observable<DocumentEmploye[]> {
    return this.http.get<DocumentEmploye[]>(
      `${this.baseUrl}/gestion-personnel/documents/employe/${employeId}`
    );
  }

  /**
   * Upload d'un document pour un employé
   */
  uploadDocument(formData: FormData): Observable<DocumentEmploye> {
    return this.http.post<DocumentEmploye>(
      `${this.baseUrl}/gestion-personnel/documents`,
      formData
    );
  }

  /**
   * Met à jour les métadonnées d'un document
   */
  modifierDocument(id: string, document: Partial<DocumentEmploye>): Observable<DocumentEmploye> {
    return this.http.put<DocumentEmploye>(
      `${this.baseUrl}/gestion-personnel/documents/${id}`,
      document
    );
  }

  /**
   * Supprime un document
   */
  supprimerDocument(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/gestion-personnel/documents/${id}`
    );
  }

  /**
   * Télécharge un document
   */
  telechargerDocument(id: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/gestion-personnel/documents/${id}/telecharger`,
      { responseType: 'blob' }
    );
  }

  /**
   * Valide ou refuse un document (RH uniquement)
   */
  validerDocument(id: string, statut: 'VALIDE' | 'REFUSE', commentaire?: string): Observable<DocumentEmploye> {
    return this.http.put<DocumentEmploye>(
      `${this.baseUrl}/gestion-personnel/documents/${id}/valider`,
      { statut, commentaire }
    );
  }
}
