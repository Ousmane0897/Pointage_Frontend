import { Injectable } from '@angular/core';
import { CLE_QR_POINTAGE, PREFIXE_QR_AGENCE, TTL_QR_POINTAGE_MS } from '../constants/pointage.constants';

interface QrMemorise {
  payload: string;
  horodatage: number;
}

/**
 * Mémorise le QR d'agence scanné entre l'écran d'accueil et la saisie du PIN.
 *
 * ⚠ Deux garde-fous, tous deux critiques : le payload est **effacé après tout pointage
 * réussi** (entrée ou sortie) et il **expire au bout de 10 min**. Sans eux, un départ
 * pointé dans une autre agence — sans rescanner, ou bien plus tard — partirait avec le
 * QR de l'agence d'arrivée et y serait attribué. Un QR absent ou périmé ⇒ pointage
 * « sans QR » (flux historique tant que le serveur ne rend pas le QR obligatoire).
 *
 * Toute lecture/écriture est protégée : un stockage indisponible (navigation privée,
 * site data bloquées) ne doit jamais empêcher de pointer.
 */
@Injectable({ providedIn: 'root' })
export class PointageQrContexteService {

  /** Horloge injectable pour les tests. */
  maintenant: () => number = () => Date.now();

  /** Mémorise un payload lu dans l'URL. Les valeurs vides sont ignorées. */
  memoriser(payload: string | null | undefined): void {
    const valeur = payload?.trim();
    if (!valeur) {
      return;
    }
    const entree: QrMemorise = { payload: valeur, horodatage: this.maintenant() };
    try {
      sessionStorage.setItem(CLE_QR_POINTAGE, JSON.stringify(entree));
    } catch {
      // Stockage indisponible : le pointage partira sans QR.
    }
  }

  /** Payload encore valide, ou `null` (absent, illisible ou périmé — alors effacé). */
  payloadValide(): string | null {
    let entree: QrMemorise | null = null;
    try {
      const brut = sessionStorage.getItem(CLE_QR_POINTAGE);
      entree = brut ? (JSON.parse(brut) as QrMemorise) : null;
    } catch {
      entree = null;
    }
    if (!entree || typeof entree.payload !== 'string' || typeof entree.horodatage !== 'number') {
      this.effacer();
      return null;
    }
    const age = this.maintenant() - entree.horodatage;
    if (age < 0 || age > TTL_QR_POINTAGE_MS) {
      this.effacer();
      return null;
    }
    return entree.payload;
  }

  /** Vrai si le payload a la forme d'un QR d'agence (contrôle d'affichage seulement). */
  static formeReconnue(payload: string | null | undefined): boolean {
    return !!payload && payload.trim().startsWith(PREFIXE_QR_AGENCE);
  }

  effacer(): void {
    try {
      sessionStorage.removeItem(CLE_QR_POINTAGE);
    } catch {
      // rien à faire
    }
  }
}
