import { Injectable } from '@angular/core';

import { LoginService } from './login.service';
import { ROLE_CONTROLEUR_STOCK, ROLE_SUPERADMIN } from '../constants/roles.constants';
import { StatutBon } from '../models/stock-v2-workflow.model';

/** Bon minimal exploitable par les contrôles de propriété (`BonSortie` ou `BonWorkflow`). */
export interface BonAvecAuteur {
  creeParEmail?: string;
}

/** Bon minimal exploitable par les contrôles dépendant du statut. */
export interface BonAvecStatut extends BonAvecAuteur {
  statut?: StatutBon;
}

/**
 * Habilitations des bons de sortie — Module Stock v2 / 7.4.
 *
 * Point unique de vérité pour la liste, la fiche, le formulaire et le tableau de workflow.
 *
 * Règles :
 * - créer un bon : tout profil ayant accès au module ;
 * - consulter / modifier / supprimer / reprendre après refus : le créateur du bon uniquement
 *   (SUPERADMIN et CONTROLEUR_STOCK ont accès à tous les bons) ;
 * - soumettre *un bon* : les mêmes — le créateur doit pouvoir renvoyer dans le circuit le bon
 *   qu'il vient de corriger, sans quoi la reprise après refus serait un cul-de-sac ;
 * - valider / refuser : SUPERADMIN uniquement ;
 * - supprimer définitivement un bon déjà engagé : SUPERADMIN uniquement — seule règle de ce service
 *   qui vaut aussi pour les **bons d'entrée** (ils n'ont pas de notion de propriété), d'où son usage
 *   depuis les écrans `bons-entree/`.
 *
 * ⚠ Ces contrôles sont une commodité d'interface : l'autorisation fait foi côté serveur
 * (403 attendu sur les endpoints correspondants).
 */
@Injectable({ providedIn: 'root' })
export class StockV2BonPermissionsService {

  constructor(private loginService: LoginService) {}

  estSuperAdmin(): boolean {
    return this.loginService.getUserRole() === ROLE_SUPERADMIN;
  }

  estControleurStock(): boolean {
    return this.loginService.getUserRole() === ROLE_CONTROLEUR_STOCK;
  }

  /** Rôle habilité à soumettre, hors contexte d'un bon précis. */
  peutSoumettre(): boolean {
    return this.estSuperAdmin() || this.estControleurStock();
  }

  /** Valider ou refuser un bon (décrémente le stock réel). */
  peutValider(): boolean {
    return this.estSuperAdmin();
  }

  /**
   * L'utilisateur courant est-il l'auteur du bon ?
   *
   * TODO — repli transitoire : tant que le backend ne renseigne pas `creeParEmail`, le champ
   * est `undefined` et la propriété est considérée comme acquise (comportement permissif,
   * identique à l'existant) afin de ne pas verrouiller l'écran avant le déploiement serveur.
   * À supprimer une fois le champ livré.
   */
  estProprietaire(bon: BonAvecAuteur | null | undefined): boolean {
    const auteur = bon?.creeParEmail?.trim().toLowerCase();
    if (!auteur) return true;
    const courant = this.loginService.getUserEmail()?.trim().toLowerCase();
    return !!courant && courant === auteur;
  }

  /** Ouvrir la fiche d'un bon. */
  peutConsulter(bon: BonAvecAuteur | null | undefined): boolean {
    return this.estSuperAdmin() || this.estControleurStock() || this.estProprietaire(bon);
  }

  peutModifier(bon: BonAvecStatut | null | undefined): boolean {
    return !!bon && bon.statut === 'BROUILLON' && this.peutConsulter(bon);
  }

  peutSupprimer(bon: BonAvecStatut | null | undefined): boolean {
    return this.peutModifier(bon);
  }

  /**
   * Supprimer un bon **déjà engagé** (soumis, validé, effectif, refusé) : SUPERADMIN seul.
   *
   * Le serveur contre-passe alors les mouvements générés et journalise l'opération. Le prédicat est
   * **disjoint de `peutSupprimer()`** (qui ne vaut qu'en BROUILLON) : les deux ne peuvent jamais
   * être vrais ensemble, donc aucun écran ne rend deux boutons de suppression.
   *
   * ⚠ Contrairement au reste du service, aucun repli permissif ici : le rôle est porté par le JWT,
   * il est toujours connu.
   */
  peutSupprimerDefinitivement(bon: BonAvecStatut | null | undefined): boolean {
    return !!bon?.statut && bon.statut !== 'BROUILLON' && this.estSuperAdmin();
  }

  /**
   * Soumettre *ce* bon.
   *
   * ⚠ N'exige plus `peutSoumettre()` : le créateur soumet ses propres bons, sans quoi il
   * corrigerait un bon repris après refus sans pouvoir le renvoyer.
   */
  peutSoumettreBon(bon: BonAvecStatut | null | undefined): boolean {
    return !!bon && bon.statut === 'BROUILLON' && this.peutConsulter(bon);
  }

  /** Reprendre un bon de sortie refusé : il repasse en brouillon pour correction. */
  peutReprendre(bon: BonAvecStatut | null | undefined): boolean {
    return !!bon && bon.statut === 'REFUSE' && this.peutConsulter(bon);
  }
}
