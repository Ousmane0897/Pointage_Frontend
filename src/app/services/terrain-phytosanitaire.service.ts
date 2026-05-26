import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ProduitPhytosanitaire,
  ApplicationPhyto,
  FiltreApplicationPhyto,
  AlerteDelaiPhyto,
} from '../models/terrain-phytosanitaire.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service du Suivi Phytosanitaire — Module Exploitation Terrain (5.2).
 *
 * Traçabilité réglementaire des applications de produits phytosanitaires :
 * registre, délais de réentrée, alertes.
 */
@Injectable({ providedIn: 'root' })
export class TerrainPhytosanitaireService {

  private baseUrl = `${environment.apiUrl}/terrain/phytosanitaire`;

  constructor(private http: HttpClient) {}

  // ─── Produits ──────────────────────────────────────────────────────────

  listerProduits(): Observable<ProduitPhytosanitaire[]> {
    return this.http.get<ProduitPhytosanitaire[]>(`${this.baseUrl}/produits`);
  }

  getProduit(id: string): Observable<ProduitPhytosanitaire> {
    return this.http.get<ProduitPhytosanitaire>(`${this.baseUrl}/produits/${id}`);
  }

  creerProduit(produit: ProduitPhytosanitaire): Observable<ProduitPhytosanitaire> {
    return this.http.post<ProduitPhytosanitaire>(`${this.baseUrl}/produits`, produit);
  }

  modifierProduit(id: string, produit: ProduitPhytosanitaire): Observable<ProduitPhytosanitaire> {
    return this.http.put<ProduitPhytosanitaire>(`${this.baseUrl}/produits/${id}`, produit);
  }

  supprimerProduit(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/produits/${id}`);
  }

  // ─── Applications ──────────────────────────────────────────────────────

  listerApplications(
    page = 0,
    size = 20,
    filtres?: FiltreApplicationPhyto,
  ): Observable<PageResponse<ApplicationPhyto>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres?.employeId) params = params.set('employeId', filtres.employeId);
    if (filtres?.produitId) params = params.set('produitId', filtres.produitId);
    if (filtres?.categorie) params = params.set('categorie', filtres.categorie);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    return this.http.get<PageResponse<ApplicationPhyto>>(
      `${this.baseUrl}/applications`,
      { params },
    );
  }

  applicationsPeriode(dateDebut: string, dateFin: string): Observable<ApplicationPhyto[]> {
    const params = new HttpParams().set('dateDebut', dateDebut).set('dateFin', dateFin);
    return this.http.get<ApplicationPhyto[]>(`${this.baseUrl}/applications/periode`, {
      params,
    });
  }

  getApplication(id: string): Observable<ApplicationPhyto> {
    return this.http.get<ApplicationPhyto>(`${this.baseUrl}/applications/${id}`);
  }

  creerApplication(application: ApplicationPhyto): Observable<ApplicationPhyto> {
    return this.http.post<ApplicationPhyto>(`${this.baseUrl}/applications`, application);
  }

  modifierApplication(id: string, application: ApplicationPhyto): Observable<ApplicationPhyto> {
    return this.http.put<ApplicationPhyto>(`${this.baseUrl}/applications/${id}`, application);
  }

  supprimerApplication(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/applications/${id}`);
  }

  // ─── Registre & alertes ────────────────────────────────────────────────

  /** Export du registre réglementaire (PDF/Excel selon endpoint backend). */
  exporterRegistrePdf(dateDebut: string, dateFin: string): Observable<Blob> {
    const params = new HttpParams().set('dateDebut', dateDebut).set('dateFin', dateFin);
    return this.http.get(`${this.baseUrl}/registre/pdf`, {
      params,
      responseType: 'blob',
    });
  }

  alertesDelais(): Observable<AlerteDelaiPhyto[]> {
    return this.http.get<AlerteDelaiPhyto[]>(`${this.baseUrl}/alertes-delais`);
  }
}
