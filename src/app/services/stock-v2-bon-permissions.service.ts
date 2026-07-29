import { Injectable } from '@angular/core';

import { LoginService } from './login.service';
import { ROLE_CONTROLEUR_STOCK, ROLE_SUPERADMIN } from '../constants/roles.constants';
import { BonSortie } from '../models/stock-v2-bon-sortie.model';

/** Bon minimal exploitable par les contrôles de propriété (`BonSortie` ou `BonWorkflow`). */
export interface BonAvecAuteur {
  creeParEmail?: string;
}

/**
 * Habilitations des bons de sortie — Module Stock v2 / 7.4.
 *
 * Point unique de vérité pour la liste, la fiche, le formulaire et le tableau de workflow.
 *
 * Règles :
 * - créer un bon : tout profil ayant accès au module ;
 * - consulter / modifier / supprimer : le créateur du bon uniquement (SUPERADMIN et
 *   CONTROLEUR_STOCK ont accès à tous les bons) ;
 * - soumettre : SUPERADMIN et CONTROLEUR_STOCK ;
 * - valider / refuser : SUPERADMIN uniquement.
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

  /** Soumettre un bon pour validation. */
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

  peutModifier(bon: BonSortie | null | undefined): boolean {
    return !!bon && bon.statut === 'BROUILLON' && this.peutConsulter(bon);
  }

  peutSupprimer(bon: BonSortie | null | undefined): boolean {
    return this.peutModifier(bon);
  }

  /** Soumettre *ce* bon : brouillon accessible + rôle habilité. */
  peutSoumettreBon(bon: BonSortie | null | undefined): boolean {
    return !!bon && bon.statut === 'BROUILLON' && this.peutSoumettre() && this.peutConsulter(bon);
  }
}
