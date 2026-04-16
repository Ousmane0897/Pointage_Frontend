import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DemandeConge,
  FiltreConge,
  SoldeConge,
} from '../models/conge.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service pour les demandes de congé et soldes.
 * Workflow : EN_ATTENTE → APPROUVE | REFUSE (décision du responsable).
 */
@Injectable({ providedIn: 'root' })
export class CongeService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── Soldes ───────────────────────────────────────────────────────────────
  getSoldes(employeId?: string): Observable<SoldeConge[]> {
    let params = new HttpParams();
    if (employeId) params = params.set('employeId', employeId);
    return this.http.get<SoldeConge[]>(
      `${this.baseUrl}/temps-presences/conges/soldes`,
      { params },
    );
  }

  getSoldeEmploye(employeId: string): Observable<SoldeConge> {
    return this.http.get<SoldeConge>(
      `${this.baseUrl}/temps-presences/conges/soldes/${employeId}`,
    );
  }

  // ─── Demandes ─────────────────────────────────────────────────────────────
  listerDemandes(
    page = 0,
    size = 10,
    filtres?: FiltreConge,
  ): Observable<PageResponse<DemandeConge>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filtres?.employeId) params = params.set('employeId', filtres.employeId);
    if (filtres?.departement) params = params.set('departement', filtres.departement);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.type) params = params.set('type', filtres.type);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.q) params = params.set('q', filtres.q);

    return this.http.get<PageResponse<DemandeConge>>(
      `${this.baseUrl}/temps-presences/conges/demandes`,
      { params },
    );
  }

  getDemandeById(id: string): Observable<DemandeConge> {
    return this.http.get<DemandeConge>(
      `${this.baseUrl}/temps-presences/conges/demandes/${id}`,
    );
  }

  creerDemande(demande: DemandeConge): Observable<DemandeConge> {
    return this.http.post<DemandeConge>(
      `${this.baseUrl}/temps-presences/conges/demandes`,
      demande,
    );
  }

  modifierDemande(id: string, demande: DemandeConge): Observable<DemandeConge> {
    return this.http.put<DemandeConge>(
      `${this.baseUrl}/temps-presences/conges/demandes/${id}`,
      demande,
    );
  }

  annulerDemande(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/temps-presences/conges/demandes/${id}`,
    );
  }

  // ─── Workflow d'approbation ───────────────────────────────────────────────
  approuver(id: string, commentaire?: string): Observable<DemandeConge> {
    return this.http.post<DemandeConge>(
      `${this.baseUrl}/temps-presences/conges/demandes/${id}/approuver`,
      { commentaire },
    );
  }

  refuser(id: string, motif: string): Observable<DemandeConge> {
    return this.http.post<DemandeConge>(
      `${this.baseUrl}/temps-presences/conges/demandes/${id}/refuser`,
      { motif },
    );
  }
}
