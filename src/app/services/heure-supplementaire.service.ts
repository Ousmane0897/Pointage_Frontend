import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  HeureSupplementaire,
  FiltreHS,
  TypeMajoration,
  TAUX_MAJORATION_HS,
} from '../models/heure-supplementaire.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service pour la déclaration et la validation des heures supplémentaires.
 * Calcul des majorations côté client selon la réglementation sénégalaise.
 */
@Injectable({ providedIn: 'root' })
export class HeureSupplementaireService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  lister(
    page = 0,
    size = 10,
    filtres?: FiltreHS,
  ): Observable<PageResponse<HeureSupplementaire>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filtres?.employeId) params = params.set('employeId', filtres.employeId);
    if (filtres?.departement) params = params.set('departement', filtres.departement);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.typeMajoration) params = params.set('typeMajoration', filtres.typeMajoration);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.q) params = params.set('q', filtres.q);

    return this.http.get<PageResponse<HeureSupplementaire>>(
      `${this.baseUrl}/temps-presences/heures-supplementaires`,
      { params },
    );
  }

  getById(id: string): Observable<HeureSupplementaire> {
    return this.http.get<HeureSupplementaire>(
      `${this.baseUrl}/temps-presences/heures-supplementaires/${id}`,
    );
  }

  declarer(hs: HeureSupplementaire): Observable<HeureSupplementaire> {
    return this.http.post<HeureSupplementaire>(
      `${this.baseUrl}/temps-presences/heures-supplementaires`,
      hs,
    );
  }

  modifier(id: string, hs: HeureSupplementaire): Observable<HeureSupplementaire> {
    return this.http.put<HeureSupplementaire>(
      `${this.baseUrl}/temps-presences/heures-supplementaires/${id}`,
      hs,
    );
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/temps-presences/heures-supplementaires/${id}`,
    );
  }

  // ─── Workflow de validation ───────────────────────────────────────────────
  valider(id: string, commentaire?: string): Observable<HeureSupplementaire> {
    return this.http.post<HeureSupplementaire>(
      `${this.baseUrl}/temps-presences/heures-supplementaires/${id}/valider`,
      { commentaire },
    );
  }

  refuser(id: string, motif: string): Observable<HeureSupplementaire> {
    return this.http.post<HeureSupplementaire>(
      `${this.baseUrl}/temps-presences/heures-supplementaires/${id}/refuser`,
      { motif },
    );
  }

  // ─── Helpers de calcul (côté client) ──────────────────────────────────────

  /**
   * Calcule le nombre d'heures entre deux horaires HH:mm.
   * Gère les plages passant minuit (ex : 22:00 → 06:00 = 8h).
   */
  calculerNombreHeures(heureDebut: string, heureFin: string): number {
    const [hD, mD] = heureDebut.split(':').map(Number);
    const [hF, mF] = heureFin.split(':').map(Number);
    let debut = hD * 60 + mD;
    let fin = hF * 60 + mF;
    if (fin <= debut) fin += 24 * 60;
    return +((fin - debut) / 60).toFixed(2);
  }

  /**
   * Calcule les heures majorées équivalentes selon le type de majoration.
   * Ex : 2h à +50 % = 2 × 1,5 = 3h majorées équivalentes.
   */
  calculerHeuresMajorees(nombreHeures: number, type: TypeMajoration): number {
    const taux = TAUX_MAJORATION_HS[type];
    return +(nombreHeures * (1 + taux / 100)).toFixed(2);
  }
}
