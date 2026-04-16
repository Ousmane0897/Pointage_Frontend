import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PeriodeEssai, DemandeValidation } from '../models/periode-essai.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service pour le suivi des périodes d'essai – Gestion du Personnel
 */
@Injectable({ providedIn: 'root' })
export class PeriodeEssaiService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── Périodes d'essai ───────────────────────────────────

  /**
   * Liste paginée des périodes d'essai
   */
  getPeriodesEssai(page = 0, size = 10, statut?: string): Observable<PageResponse<PeriodeEssai>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (statut) params = params.set('statut', statut);

    return this.http.get<PageResponse<PeriodeEssai>>(
      `${this.baseUrl}/gestion-personnel/periodes-essai`,
      { params }
    );
  }

  /**
   * Récupère une période d'essai par ID
   */
  getPeriodeEssaiById(id: string): Observable<PeriodeEssai> {
    return this.http.get<PeriodeEssai>(
      `${this.baseUrl}/gestion-personnel/periodes-essai/${id}`
    );
  }

  /**
   * Prolonge une période d'essai
   */
  prolongerPeriodeEssai(id: string, nouvelleDateFin: string, commentaire: string): Observable<PeriodeEssai> {
    return this.http.put<PeriodeEssai>(
      `${this.baseUrl}/gestion-personnel/periodes-essai/${id}/prolonger`,
      { nouvelleDateFin, commentaire }
    );
  }

  /**
   * Récupère les alertes de périodes d'essai arrivant à échéance
   */
  getAlertes(): Observable<PeriodeEssai[]> {
    return this.http.get<PeriodeEssai[]>(
      `${this.baseUrl}/gestion-personnel/periodes-essai/alertes`
    );
  }

  // ─── Workflow de validation ─────────────────────────────

  /**
   * Liste les demandes de validation en attente
   */
  getDemandesValidation(statut?: string): Observable<DemandeValidation[]> {
    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);

    return this.http.get<DemandeValidation[]>(
      `${this.baseUrl}/gestion-personnel/periodes-essai/validations`,
      { params }
    );
  }

  /**
   * Crée une demande de titularisation (manager → RH)
   */
  creerDemandeValidation(periodeEssaiId: string, commentaire: string): Observable<DemandeValidation> {
    return this.http.post<DemandeValidation>(
      `${this.baseUrl}/gestion-personnel/periodes-essai/${periodeEssaiId}/validations`,
      { commentaire }
    );
  }

  /**
   * Valide une demande (manager ou RH selon le workflow)
   */
  validerDemande(demandeId: string, decision: string, commentaire: string): Observable<DemandeValidation> {
    return this.http.put<DemandeValidation>(
      `${this.baseUrl}/gestion-personnel/periodes-essai/validations/${demandeId}`,
      { decision, commentaire }
    );
  }
}
