import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { NoeudOrganigramme, Departement } from '../models/organigramme.model';

/**
 * Service pour l'organigramme hiérarchique – Gestion du Personnel
 */
@Injectable({ providedIn: 'root' })
export class OrganigrammeService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Récupère l'arbre hiérarchique complet
   */
  getArbreComplet(): Observable<NoeudOrganigramme[]> {
    return this.http.get<NoeudOrganigramme[]>(
      `${this.baseUrl}/gestion-personnel/organigramme`
    );
  }

  /**
   * Récupère l'organigramme d'un département spécifique
   */
  getParDepartement(departementId: string): Observable<NoeudOrganigramme> {
    return this.http.get<NoeudOrganigramme>(
      `${this.baseUrl}/gestion-personnel/organigramme/departement/${departementId}`
    );
  }

  /**
   * Liste tous les départements
   */
  getDepartements(): Observable<Departement[]> {
    return this.http.get<Departement[]>(
      `${this.baseUrl}/gestion-personnel/organigramme/departements`
    );
  }

  /**
   * Récupère les subordonnés directs d'un employé
   */
  getSubordonnes(employeId: string): Observable<NoeudOrganigramme[]> {
    return this.http.get<NoeudOrganigramme[]>(
      `${this.baseUrl}/gestion-personnel/organigramme/subordonnes/${employeId}`
    );
  }
}
