import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Materiel,
  EvenementMateriel,
  MaintenanceProgrammee,
  FiltreMateriel,
  AlerteMaintenance,
} from '../models/terrain-materiel.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service de Gestion du Matériel par Site — Module Exploitation Terrain (5.2).
 */
@Injectable({ providedIn: 'root' })
export class TerrainMaterielService {

  private baseUrl = `${environment.apiUrl}/terrain/materiel`;

  constructor(private http: HttpClient) {}

  // ─── Matériel ──────────────────────────────────────────────────────────

  lister(
    page = 0,
    size = 20,
    filtres?: FiltreMateriel,
  ): Observable<PageResponse<Materiel>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.q) params = params.set('q', filtres.q);
    if (filtres?.type) params = params.set('type', filtres.type);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.siteAffecteId) params = params.set('siteAffecteId', filtres.siteAffecteId);
    return this.http.get<PageResponse<Materiel>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<Materiel> {
    return this.http.get<Materiel>(`${this.baseUrl}/${id}`);
  }

  creer(materiel: Materiel): Observable<Materiel> {
    return this.http.post<Materiel>(this.baseUrl, materiel);
  }

  modifier(id: string, materiel: Materiel): Observable<Materiel> {
    return this.http.put<Materiel>(`${this.baseUrl}/${id}`, materiel);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Affecter le matériel à un autre site (génère un EvenementMateriel.AFFECTATION). */
  affecterAuSite(materielId: string, siteId: string, commentaire?: string): Observable<Materiel> {
    return this.http.post<Materiel>(`${this.baseUrl}/${materielId}/affecter`, {
      siteId,
      commentaire,
    });
  }

  // ─── Maintenance & événements ───────────────────────────────────────────

  historique(materielId: string): Observable<EvenementMateriel[]> {
    return this.http.get<EvenementMateriel[]>(
      `${this.baseUrl}/${materielId}/historique`,
    );
  }

  declarerPanne(materielId: string, description: string): Observable<EvenementMateriel> {
    return this.http.post<EvenementMateriel>(
      `${this.baseUrl}/${materielId}/panne`,
      { description },
    );
  }

  declarerMaintenance(materielId: string, evenement: EvenementMateriel): Observable<EvenementMateriel> {
    return this.http.post<EvenementMateriel>(
      `${this.baseUrl}/${materielId}/maintenance`,
      evenement,
    );
  }

  // ─── Maintenance programmée ─────────────────────────────────────────────

  maintenancesProgrammees(dateDebut: string, dateFin: string): Observable<MaintenanceProgrammee[]> {
    const params = new HttpParams().set('dateDebut', dateDebut).set('dateFin', dateFin);
    return this.http.get<MaintenanceProgrammee[]>(
      `${this.baseUrl}/maintenance-programmee`,
      { params },
    );
  }

  programmerMaintenance(maintenance: MaintenanceProgrammee): Observable<MaintenanceProgrammee> {
    return this.http.post<MaintenanceProgrammee>(
      `${this.baseUrl}/maintenance-programmee`,
      maintenance,
    );
  }

  /** Alertes de maintenance préventive (par date d'échéance). */
  alertesMaintenance(): Observable<AlerteMaintenance[]> {
    return this.http.get<AlerteMaintenance[]>(`${this.baseUrl}/alertes`);
  }
}
