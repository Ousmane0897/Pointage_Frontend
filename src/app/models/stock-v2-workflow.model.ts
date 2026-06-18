/**
 * Modèles du Workflow de validation — Module Stock v2 / 7.4 Contrôle des mouvements.
 *
 * Le workflow est porté par un document « Bon » multi-lignes (BonEntree /
 * BonSortie). Cycle de vie strict :
 *   BROUILLON → SOUMIS → VALIDE → EFFECTIF   (ou → REFUSE)
 *
 * Aucun mouvement de stock 7.3 n'est généré tant que le bon n'est pas passé
 * EFFECTIF (déclenché côté serveur à la validation). L'auteur de chaque action
 * est déduit du JWT côté serveur et dénormalisé dans l'historique.
 */

/** Statut du cycle de vie d'un bon (entrée ou sortie). */
export type StatutBon =
  | 'BROUILLON'
  | 'SOUMIS'
  | 'VALIDE'
  | 'EFFECTIF'
  | 'REFUSE';

/** Action tracée dans l'historique du workflow. */
export type ActionWorkflow =
  | 'CREATION'
  | 'MODIFICATION'
  | 'SOUMISSION'
  | 'VALIDATION'
  | 'REFUS'
  | 'EFFECTIF';

/** Sens d'un bon, utilisé par le tableau de workflow unifié. */
export type SensBon = 'ENTREE' | 'SORTIE';

/** Entrée d'historique : qui a fait quoi, quand, avec quel commentaire. */
export interface HistoriqueWorkflow {
  action: ActionWorkflow;
  auteur?: string;          // dénormalisé (nom) — renseigné serveur via JWT
  date: string;             // ISO complet
  commentaire?: string;
}

/** Corps des transitions de décision (commentaire requis pour le refus). */
export interface DecisionWorkflowPayload {
  commentaire?: string;
}

/**
 * Charge utile des notifications temps réel de validation
 * (`/topic/stock-validations` en broadcast, `/user/queue/notifications-stock`
 * ciblée vers le validateur Responsable Achats).
 */
export interface NotificationValidationStock {
  type: 'BON_SOUMIS' | 'BON_VALIDE' | 'BON_REFUSE' | 'BON_EFFECTIF' | 'INFO';
  sens: SensBon;
  bonId: string;
  reference: string;
  titre: string;
  message: string;
  dateEmission: string;
}

/**
 * Ligne unifiée affichée dans le tableau de workflow (Kanban) — agrège les
 * bons d'entrée et de sortie en attente / traités.
 */
export interface BonWorkflow {
  id: string;
  reference: string;
  sens: SensBon;
  statut: StatutBon;
  date: string;
  libelleType: string;       // libellé du TypeEntree / TypeSortie
  siteNom?: string;          // destination (entrée) ou source (sortie)
  destinataireNom?: string;  // sorties uniquement
  demandeurNom?: string;
  validateurNom?: string;
  nbLignes: number;
  montantTotal?: number;
  motifRefus?: string;
}
