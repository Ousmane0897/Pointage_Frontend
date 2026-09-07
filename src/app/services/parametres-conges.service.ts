import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { PARAMETRES_CONGES_DEFAUT, ParametresConges } from '../models/parametres-conges.model';

/**
 * Barème des droits à congés (singleton serveur).
 *
 * ⚠ **Caché pour la session**, sur le même patron que `monProfil$` /
 * `employesSelectionnables$` de {@link CongeService} : cinq écrans de solde le
 * demandent pour composer leur note explicative, une requête par session suffit.
 *
 * ⚠ Le **GET est infaillible** : toute erreur (404 d'un backend pas encore déployé,
 * réseau) retombe sur le barème légal. Un bloc de solde ne doit pas perdre sa note
 * de pied parce qu'un appel annexe a échoué. L'écran de paramétrage, lui, distingue
 * les deux cas — il utilise {@link #charger}.
 */
@Injectable({ providedIn: 'root' })
export class ParametresCongesService {

  private readonly url = `${environment.apiUrl}/temps-presences/conges/parametres`;

  private bareme$?: Observable<ParametresConges>;

  constructor(private http: HttpClient) {}

  /** Barème courant, caché, avec repli sur le barème légal en cas d'échec. */
  getParametres(): Observable<ParametresConges> {
    if (!this.bareme$) {
      this.bareme$ = this.http.get<ParametresConges>(this.url).pipe(
        catchError(() => of(PARAMETRES_CONGES_DEFAUT)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.bareme$;
  }

  /**
   * Lecture **non cachée et non protégée** — l'écran de paramétrage doit voir une
   * erreur pour ne pas laisser croire que le barème légal affiché est celui en base.
   */
  charger(): Observable<ParametresConges> {
    return this.http.get<ParametresConges>(this.url);
  }

  /**
   * Enregistre le barème. ⚠ Le serveur applique un **patch** : les champs omis
   * restent inchangés. 403 hors RH / super-admin.
   *
   * Vide le cache : les notes de pied des écrans de solde doivent refléter le
   * nouveau barème sans recharger l'application.
   */
  modifierParametres(parametres: Partial<ParametresConges>): Observable<ParametresConges> {
    this.bareme$ = undefined;
    return this.http.put<ParametresConges>(this.url, parametres);
  }

  /** Purge le cache (changement de compte). */
  invalider(): void {
    this.bareme$ = undefined;
  }
}
