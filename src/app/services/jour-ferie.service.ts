import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { JourFerie, JourFeriePayload } from '../models/jour-ferie.model';

/**
 * Référentiel des jours fériés (module RH 6.2).
 *
 * ⚠ **Caché par année**, sur le patron de {@link ParametresCongesService} : plusieurs
 * écrans (récapitulatif, calendrier de planning) demanderont le même calendrier, une
 * requête par année et par session suffit.
 *
 * ⚠ Le **GET caché est infaillible** : toute erreur (backend pas encore déployé, réseau)
 * retombe sur une liste vide, c'est-à-dire sur le comportement antérieur au référentiel.
 * Un écran de récapitulatif ne doit pas se vider parce qu'un appel annexe a échoué.
 * L'écran de saisie, lui, doit distinguer les deux cas — il utilise {@link charger}.
 */
@Injectable({ providedIn: 'root' })
export class JourFerieService {

  private readonly url = `${environment.apiUrl}/temps-presences/jours-feries`;

  private readonly cache = new Map<number, Observable<JourFerie[]>>();

  constructor(private http: HttpClient) {}

  /** Fériés d'une année, cachés, avec repli sur liste vide en cas d'échec. */
  getParAnnee(annee: number): Observable<JourFerie[]> {
    let flux = this.cache.get(annee);
    if (!flux) {
      flux = this.http.get<JourFerie[]>(this.url, { params: new HttpParams().set('annee', annee) }).pipe(
        catchError(() => of([] as JourFerie[])),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.cache.set(annee, flux);
    }
    return flux;
  }

  /**
   * Dates fériées d'une année, en `Set` de `yyyy-MM-dd` — la forme utile aux calculs
   * d'affichage (griser un jour, exclure une date). Les comparaisons se font **lexicalement
   * sur la chaîne ISO**, jamais via `Date` : `toISOString()` décalerait d'un jour selon le
   * fuseau, piège déjà documenté pour les affectations.
   */
  datesFeriees(annee: number): Observable<Set<string>> {
    return this.getParAnnee(annee).pipe(map(feries => new Set(feries.map(f => f.date.slice(0, 10)))));
  }

  /** Lecture **non cachée et non protégée** — l'écran de saisie doit voir ses erreurs. */
  charger(annee: number): Observable<JourFerie[]> {
    return this.http.get<JourFerie[]>(this.url, { params: new HttpParams().set('annee', annee) });
  }

  /** 409 si la date est déjà prise, 403 hors RH / super-admin. */
  creer(payload: JourFeriePayload): Observable<JourFerie> {
    return this.http.post<JourFerie>(this.url, payload).pipe(tap(() => this.invalider()));
  }

  modifier(id: string, payload: JourFeriePayload): Observable<JourFerie> {
    return this.http.put<JourFerie>(`${this.url}/${id}`, payload).pipe(tap(() => this.invalider()));
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(tap(() => this.invalider()));
  }

  /**
   * Recopie les fériés **à date fixe** de `anneeSource` sur `anneeCible`. Les fêtes mobiles
   * sont volontairement ignorées côté serveur. Renvoie les seuls fériés **créés** : une
   * liste vide signifie que tout était déjà en place, pas un échec.
   */
  dupliquerAnnee(anneeSource: number, anneeCible: number): Observable<JourFerie[]> {
    const params = new HttpParams().set('anneeSource', anneeSource).set('anneeCible', anneeCible);
    return this.http.post<JourFerie[]>(`${this.url}/dupliquer`, null, { params })
      .pipe(tap(() => this.invalider()));
  }

  /**
   * Purge le cache. Appelé après chaque écriture : un récapitulatif ouvert derrière l'écran
   * de saisie doit refléter le nouveau calendrier sans recharger l'application.
   */
  invalider(): void {
    this.cache.clear();
  }
}
