import { Injectable } from '@angular/core';
import { PARAMETRES_VALORISATION } from '../constants/stock-v2-valorisation.constants';

/**
 * Service de calcul du coût unitaire — Module Stock v2 / 7.6.
 *
 * Service PUR (aucune dépendance HTTP), entièrement testable. Reproduit côté
 * client la logique de valorisation appliquée par le serveur, pour la
 * simulation / la prévisualisation et la détection d'écarts anormaux.
 *
 * Le recalcul de référence reste exécuté côté serveur à chaque entrée ; ces
 * méthodes servent à anticiper le résultat et à colorer les alertes.
 */
@Injectable({ providedIn: 'root' })
export class StockV2CumpService {

  /**
   * Coût unitaire moyen pondéré après une entrée.
   *
   *   nouveauCout = (stockActuel × ancienCout + qteEntree × prixAchat)
   *                 / (stockActuel + qteEntree)
   *
   * Cas limites :
   * - quantité totale ≤ 0 → on retombe sur le prix d'achat (pas de moyenne possible) ;
   * - qteEntree ≤ 0 → le coût est inchangé (aucune entrée valorisante).
   */
  calculerCump(stockActuel: number, ancienCout: number, qteEntree: number, prixAchat: number): number {
    if (qteEntree <= 0) return this.arrondir(ancienCout);
    const totalQte = stockActuel + qteEntree;
    if (totalQte <= 0) return this.arrondir(prixAchat);
    const base = Math.max(stockActuel, 0);
    const cump = (base * ancienCout + qteEntree * prixAchat) / (base + qteEntree);
    return this.arrondir(cump);
  }

  /** Méthode « dernier prix d'achat » : le coût prend la valeur du dernier prix reçu. */
  nouveauCoutDernierPrix(prixAchat: number): number {
    return this.arrondir(Math.max(prixAchat, 0));
  }

  /**
   * Écart relatif (%) entre deux coûts successifs (valeur absolue).
   * Renvoie 0 si l'ancien coût est nul (pas de base de comparaison).
   */
  ecartCoutPct(ancienCout: number, nouveauCout: number): number {
    if (ancienCout <= 0) return 0;
    return Math.abs((nouveauCout - ancienCout) / ancienCout) * 100;
  }

  /**
   * Indique si l'écart entre deux coûts dépasse le seuil d'anomalie paramétré
   * (`PARAMETRES_VALORISATION.ecartCoutAnormalPct`).
   */
  estEcartAnormal(ancienCout: number, nouveauCout: number): boolean {
    return this.ecartCoutPct(ancienCout, nouveauCout) > PARAMETRES_VALORISATION.ecartCoutAnormalPct;
  }

  /** Valeur d'un stock : quantité × coût unitaire (FCFA entiers). */
  valeur(quantite: number, coutUnitaire: number): number {
    return this.arrondir(Math.max(quantite, 0) * Math.max(coutUnitaire, 0));
  }

  /** FCFA sans décimales. */
  private arrondir(n: number): number {
    return Math.round(n);
  }
}
