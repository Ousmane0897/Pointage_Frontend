import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PointageCentralise,
  FiltrePointage,
  ResumeJournee,
} from '../models/pointage-centralise.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service de lecture du pointage centralisé (vue tous départements confondus).
 * Les données sont remontées automatiquement depuis le module Exploitation.
 */
@Injectable({ providedIn: 'root' })
export class PointageCentraliseService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Liste paginée des pointages avec filtres.
   */
  listerPointages(
    page = 0,
    size = 20,
    filtres?: FiltrePointage,
  ): Observable<PageResponse<PointageCentralise>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filtres?.date) params = params.set('date', filtres.date);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.departement) params = params.set('departement', filtres.departement);
    if (filtres?.site) params = params.set('site', filtres.site);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.q) params = params.set('q', filtres.q);

    return this.http.get<PageResponse<PointageCentralise>>(
      `${this.baseUrl}/temps-presences/pointages`,
      { params },
    );
  }

  /**
   * Résumé agrégé d'une journée (présents / absents / retards / en congé).
   */
  getResumeJournee(date: string): Observable<ResumeJournee> {
    const params = new HttpParams().set('date', date);
    return this.http.get<ResumeJournee>(
      `${this.baseUrl}/temps-presences/pointages/resume`,
      { params },
    );
  }
}
