/**
 * Modèle de données pour les Sanctions & Disciplinaire – Développement RH
 *
 * Procédure disciplinaire sénégalaise :
 *   1. Convocation écrite (minimum 3 jours ouvrés avant l'entretien)
 *   2. Entretien préalable
 *   3. Notification écrite de la sanction
 *   4. Exécution de la sanction
 *
 * Durée maximale mise à pied : 8 jours (Code du Travail sénégalais).
 */

// ─── Types ────────────────────────────────────────────────────────

export type TypeSanction = 'AVERTISSEMENT' | 'BLAME' | 'MISE_A_PIED' | 'LICENCIEMENT';

export type StatutSanction =
  | 'CONVOCATION'
  | 'ENTRETIEN_PLANIFIE'
  | 'NOTIFICATION'
  | 'EXECUTEE'
  | 'ANNULEE';

// ─── Interfaces ───────────────────────────────────────────────────

export interface PieceJointeSanction {
  id?: string;
  nom: string;
  url?: string;
  mimeType?: string;
  taille?: number;               // octets
  dateUpload?: string;
}

export interface Sanction {
  id?: string;

  // Référence employé
  employeId: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  departement?: string;

  // Sanction
  type: TypeSanction;
  motif: string;
  description?: string;
  dateFaits: string;             // yyyy-MM-dd
  dateSanction: string;          // yyyy-MM-dd

  // Procédure disciplinaire sénégalaise
  dateConvocation?: string;      // yyyy-MM-dd
  dateEntretien?: string;        // yyyy-MM-dd (min 3 jours ouvrés après convocation)
  dateNotification?: string;     // yyyy-MM-dd
  delaiRespectJours?: number;    // jours entre convocation et entretien

  // Spécifique mise à pied
  dureeMiseAPied?: number;       // en jours, max 8

  // Pièces jointes
  piecesJointes?: PieceJointeSanction[];

  // État
  statut: StatutSanction;
  commentaire?: string;

  // Métadonnées
  creeParId?: string;
  creeParNom?: string;
  dateCreation?: string;
}

export interface AlerteRecidive {
  employeId: string;
  nom: string;
  prenom: string;
  nombreSanctions: number;
  derniereDate: string;
  derniereType: TypeSanction;
  message: string;
}

// ─── Filtres ──────────────────────────────────────────────────────

export interface FiltreSanction {
  employeId?: string;
  type?: TypeSanction;
  statut?: StatutSanction;
  dateDebut?: string;
  dateFin?: string;
  departement?: string;
  q?: string;
}

// ─── Labels fr-FR ─────────────────────────────────────────────────

export const LIBELLES_TYPE_SANCTION: Record<TypeSanction, string> = {
  AVERTISSEMENT: 'Avertissement',
  BLAME: 'Blâme',
  MISE_A_PIED: 'Mise à pied',
  LICENCIEMENT: 'Licenciement',
};

export const LIBELLES_STATUT_SANCTION: Record<StatutSanction, string> = {
  CONVOCATION: 'Convocation envoyée',
  ENTRETIEN_PLANIFIE: 'Entretien planifié',
  NOTIFICATION: 'Notification envoyée',
  EXECUTEE: 'Exécutée',
  ANNULEE: 'Annulée',
};
