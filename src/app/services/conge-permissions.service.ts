import { Injectable } from '@angular/core';
import { Observable, catchError, of, shareReplay, tap } from 'rxjs';

import { CongeService } from './conge.service';
import { LoginService } from './login.service';
import { ROLE_EXPLOITATION, ROLE_RH, ROLE_SUPERADMIN } from '../constants/roles.constants';
import { NIVEAU_PAR_STATUT, STATUTS_EN_COURS } from '../constants/conges.constants';
import { DemandeConge, MonProfilConge } from '../models/conge.model';

/**
 * Habilitations du circuit de validation des congés — RH / 6.2.
 *
 * | Action                              | Autorisation                                   |
 * |-------------------------------------|------------------------------------------------|
 * | Déposer une demande pour soi        | tout profil ayant accès au module              |
 * | Déposer pour un tiers               | `RH`, `SUPERADMIN` (tous) et `EXPLOITATION` (ses subordonnés directs) |
 * | Valider / refuser au niveau 1       | le supérieur hiérarchique du demandeur         |
 * | Valider / refuser au niveau 2       | `RH` (et `SUPERADMIN`)                         |
 * | Valider / refuser au niveau 3       | `SUPERADMIN` (la Direction générale)           |
 * | Annuler une demande                 | son demandeur, tant qu'elle est dans le circuit, + `RH`/`SUPERADMIN` |
 *
 * ⚠ Ces contrôles sont une **commodité d'interface** : l'autorisation fait foi
 * côté serveur (403 attendu sur les endpoints correspondants).
 *
 * Le JWT ne porte ni `id` ni `employeId` : « qui suis-je » est résolu par
 * `GET /temps-presences/conges/moi` (`charger()`), et la file de validation par
 * `GET /demandes/a-valider`. Aucun calcul de subordonnés côté client.
 */
@Injectable({ providedIn: 'root' })
export class CongePermissionsService {

  /** Profil courant, ou `null` si la résolution serveur a échoué. */
  private profil: MonProfilConge | null = null;
  private chargement$?: Observable<MonProfilConge | null>;

  constructor(
    private loginService: LoginService,
    private congeService: CongeService,
  ) {}

  // ─── Profil ───────────────────────────────────────────────────────────────

  /**
   * Charge (une seule fois) le profil métier de l'appelant. Ne rejette jamais :
   * en cas d'échec le profil reste `null` et seuls les contrôles par rôle
   * s'appliquent — l'écran reste utilisable, le serveur reste seul juge.
   */
  charger(): Observable<MonProfilConge | null> {
    if (!this.chargement$) {
      this.chargement$ = this.congeService.getMonProfil().pipe(
        tap(p => (this.profil = p)),
        catchError(() => {
          this.profil = null;
          return of(null);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.chargement$;
  }

  /** Profil déjà chargé (`null` tant que `charger()` n'a pas abouti). */
  get monProfil(): MonProfilConge | null {
    return this.profil;
  }

  /** Le profil métier a-t-il pu être résolu ? (bandeau d'avertissement sinon) */
  profilResolu(): boolean {
    return !!this.profil?.employeId;
  }

  // ─── Rôles ────────────────────────────────────────────────────────────────

  estSuperAdmin(): boolean {
    return this.loginService.getUserRole() === ROLE_SUPERADMIN;
  }

  estRh(): boolean {
    return this.loginService.getUserRole() === ROLE_RH;
  }

  /** La Direction générale *est* le super-admin — pas de rôle dédié. */
  estDirectionGenerale(): boolean {
    return this.estSuperAdmin();
  }

  /** Responsable d'équipe terrain — dépose pour ses subordonnés directs. */
  estExploitation(): boolean {
    return this.loginService.getUserRole() === ROLE_EXPLOITATION;
  }

  // ─── Création ─────────────────────────────────────────────────────────────

  /**
   * Le sélecteur d'employé peut-il contenir quelqu'un d'autre que soi ?
   *
   * ⚠ Ne dit **pas** *qui* est sélectionnable : la liste est calculée serveur
   * (`GET /conges/employes-selectionnables`) — tous les employés pour `RH` et
   * `SUPERADMIN`, soi + ses subordonnés directs pour `EXPLOITATION`. Ce booléen
   * n'est qu'un libellé d'interface ; le formulaire s'appuie sur la longueur de
   * la liste reçue, jamais sur ce rôle, pour décider s'il rend un `<select>`.
   */
  peutCreerPourAutrui(): boolean {
    return this.estSuperAdmin() || this.estRh() || this.estExploitation();
  }

  // ─── Propriété ────────────────────────────────────────────────────────────

  /** La demande est-elle celle de l'utilisateur connecté ? */
  estMaDemande(d: DemandeConge | null | undefined): boolean {
    const moi = this.profil?.employeId;
    return !!moi && !!d?.employeId && d.employeId === moi;
  }

  /** Le demandeur est-il mon subordonné direct ? */
  estMonSubordonne(d: DemandeConge | null | undefined): boolean {
    const moi = this.profil?.employeId;
    return !!moi && !!d?.superieurHierarchiqueId && d.superieurHierarchiqueId === moi;
  }

  // ─── Validation ───────────────────────────────────────────────────────────

  /**
   * Peut agir sur le **niveau courant** de cette demande.
   *
   * `peutValiderParMoi` est l'autorité : le serveur l'a calculé pour l'appelant.
   * Le reste n'est qu'un repli tant que le backend n'expose pas le champ
   * (même parti pris permissif que `estProprietaire()` du module Stock).
   */
  peutValiderNiveau(d: DemandeConge | null | undefined): boolean {
    if (!d) return false;
    if (d.peutValiderParMoi !== undefined) return d.peutValiderParMoi;

    // TODO backend : retirer ce repli une fois `peutValiderParMoi` renvoyé.
    if (!STATUTS_EN_COURS.includes(d.statut)) return false;
    if (this.estSuperAdmin()) return true;   // agit à tous les niveaux

    switch (NIVEAU_PAR_STATUT[d.statut]) {
      case 'SUPERIEUR':
        // Profil non résolu ⇒ permissif : le serveur tranchera (403).
        return this.profilResolu() ? this.estMonSubordonne(d) : true;
      case 'RH':
        return this.estRh();
      case 'DIRECTION_GENERALE':
        return this.estDirectionGenerale();
      default:
        return false;
    }
  }

  // ─── Périmètre de lecture ─────────────────────────────────────────────────

  /**
   * Vue complète des congés (tous les employés) : RH et Direction générale.
   *
   * ⚠ **Cosmétique** : le périmètre réel est appliqué **côté serveur** (un agent ne reçoit
   * que ses congés, un supérieur y ajoute ses subordonnés directs). Ces deux méthodes ne
   * servent qu'à masquer des filtres et des colonnes devenus vides de sens.
   */
  voitTousLesConges(): boolean {
    return this.estRh() || this.estSuperAdmin();
  }

  /**
   * Le périmètre dépasse-t-il ses propres congés ? (supérieur hiérarchique, RH, DG)
   *
   * ⚠ Parti pris **inverse** du reste de ce service : profil non résolu ⇒ **restrictif**.
   * Se tromper ici ne fait que masquer un filtre, alors que la liste sera de toute façon
   * réduite par le serveur — tandis qu'afficher « recherche par nom » à un agent qui ne
   * verra jamais que ses propres lignes est trompeur.
   */
  voitPlusieursEmployes(): boolean {
    return this.voitTousLesConges()
      || !!this.profil?.niveauxValidables.includes('SUPERIEUR');
  }

  /** Accès à l'écran « Validation congés ». */
  peutAccederFileValidation(): boolean {
    if (this.estSuperAdmin() || this.estRh()) return true;
    if (this.profil) return this.profil.niveauxValidables.length > 0;
    // Profil non encore chargé : on laisse l'écran s'ouvrir, il affichera son
    // état vide si la file revient vide.
    return true;
  }

  // ─── Annulation ───────────────────────────────────────────────────────────

  peutAnnuler(d: DemandeConge | null | undefined): boolean {
    if (!d || !STATUTS_EN_COURS.includes(d.statut)) return false;
    if (this.estSuperAdmin() || this.estRh()) return true;
    // Profil non résolu ⇒ permissif, comme pour la validation.
    return this.profilResolu() ? this.estMaDemande(d) : true;
  }
}
