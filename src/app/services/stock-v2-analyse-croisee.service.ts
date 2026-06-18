import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  RequeteCroisee,
  RequeteFavorite,
  ResultatCroise,
} from '../models/stock-v2-analyse-croisee.model';
import { PARAMETRES_ANALYSE_CONSO } from '../constants/stock.constants';

/**
 * Service d'agrégation — 7.5 Filtres croisés.
 *
 * `executer()` : agrégation pivot côté serveur (LECTURE SEULE).
 * Gestion des requêtes favorites en localStorage (aucun endpoint backend) —
 * cohérent avec la nature purement analytique du module.
 */
@Injectable({ providedIn: 'root' })
export class StockV2AnalyseCroiseeService {

  private baseUrl = `${environment.apiUrl}/stock/analyse`;
  private readonly cleFavoris = PARAMETRES_ANALYSE_CONSO.cleFavorisLocalStorage;

  constructor(private http: HttpClient) {}

  /** Exécute une requête croisée et renvoie le tableau pivot. */
  executer(requete: RequeteCroisee): Observable<ResultatCroise> {
    let params = new HttpParams()
      .set('axeLignes', requete.axeLignes)
      .set('mesure', requete.mesure)
      .set('dateDebut', requete.dateDebut)
      .set('dateFin', requete.dateFin);
    if (requete.axeColonnes) params = params.set('axeColonnes', requete.axeColonnes);
    if (requete.filtres.siteId) params = params.set('siteId', requete.filtres.siteId);
    if (requete.filtres.produitId) params = params.set('produitId', requete.filtres.produitId);
    if (requete.filtres.categorieId) params = params.set('categorieId', requete.filtres.categorieId);
    if (requete.filtres.typeSortie) params = params.set('typeSortie', requete.filtres.typeSortie);
    return this.http.get<ResultatCroise>(`${this.baseUrl}/croise`, { params });
  }

  // ─── Requêtes favorites (localStorage) ────────────────────────────────────

  listerFavoris(): RequeteFavorite[] {
    try {
      const raw = localStorage.getItem(this.cleFavoris);
      return raw ? (JSON.parse(raw) as RequeteFavorite[]) : [];
    } catch {
      return [];
    }
  }

  /** Sauvegarde une nouvelle requête favorite et renvoie la liste à jour. */
  sauverFavori(nom: string, requete: RequeteCroisee): RequeteFavorite[] {
    const favoris = this.listerFavoris();
    const favori: RequeteFavorite = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      nom,
      requete,
    };
    const maj = [...favoris, favori];
    localStorage.setItem(this.cleFavoris, JSON.stringify(maj));
    return maj;
  }

  /** Supprime une requête favorite et renvoie la liste à jour. */
  supprimerFavori(id: string): RequeteFavorite[] {
    const maj = this.listerFavoris().filter(f => f.id !== id);
    localStorage.setItem(this.cleFavoris, JSON.stringify(maj));
    return maj;
  }
}
