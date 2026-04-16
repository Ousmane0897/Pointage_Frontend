import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Absence, FiltreAbsence } from '../models/absence.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service CRUD des absences (congés payés, maladie, permission, injustifiée, autre).
 */
@Injectable({ providedIn: 'root' })
export class AbsenceService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 10,
    filtres?: FiltreAbsence,
  ): Observable<PageResponse<Absence>> {
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

    return this.http.get<PageResponse<Absence>>(
      `${this.baseUrl}/temps-presences/absences`,
      { params },
    );
  }

  getById(id: string): Observable<Absence> {
    return this.http.get<Absence>(
      `${this.baseUrl}/temps-presences/absences/${id}`,
    );
  }

  /**
   * Crée une absence. Utilise FormData pour supporter l'upload d'une pièce justificative.
   */
  creer(formData: FormData): Observable<Absence> {
    return this.http.post<Absence>(
      `${this.baseUrl}/temps-presences/absences`,
      formData,
    );
  }

  modifier(id: string, formData: FormData): Observable<Absence> {
    return this.http.put<Absence>(
      `${this.baseUrl}/temps-presences/absences/${id}`,
      formData,
    );
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/temps-presences/absences/${id}`,
    );
  }

  /**
   * Ajoute/remplace la pièce justificative d'une absence existante.
   */
  uploadJustificatif(id: string, fichier: File): Observable<Absence> {
    const formData = new FormData();
    formData.append('fichier', fichier);
    return this.http.post<Absence>(
      `${this.baseUrl}/temps-presences/absences/${id}/justificatif`,
      formData,
    );
  }
}
