/**
 * Modèle de données pour les Heures Supplémentaires – Temps & Présences
 *
 * Taux de majoration (réglementation sénégalaise) :
 *   T_15  : jusqu'à 8h sup/semaine (jours ouvrables)        → +15 %
 *   T_40  : au-delà de 8h sup/semaine                       → +40 %
 *   T_60  : heures effectuées un dimanche ou jour férié     → +60 %
 *   T_100 : heures de nuit                                  → +100 %
 */

export type TypeMajoration = 'T_15' | 'T_40' | 'T_60' | 'T_100';

export type StatutValidationHS = 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE';

export interface HeureSupplementaire {
  id?: string;

  // Référence employé
  employeId: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  departement?: string;

  // Déclaration
  date: string;                 // yyyy-MM-dd
  heureDebut: string;           // HH:mm
  heureFin: string;             // HH:mm
  nombreHeures: number;         // décimal, ex : 2.5

  typeMajoration: TypeMajoration;
  tauxMajoration?: number;      // ex : 15, 40, 60, 100
  motif?: string;

  // Majoration calculée (informative, peut venir du serveur)
  heuresMajoreesEquivalent?: number;

  // Workflow
  statut: StatutValidationHS;
  dateDeclaration?: string;
  dateDecision?: string;
  decideurId?: string;
  decideurNom?: string;
  commentaireDecision?: string;
}

export interface FiltreHS {
  employeId?: string;
  departement?: string;
  statut?: StatutValidationHS;
  typeMajoration?: TypeMajoration;
  dateDebut?: string;
  dateFin?: string;
  q?: string;
}

/** Taux de majoration exprimés en pourcentage entier. */
export const TAUX_MAJORATION_HS: Record<TypeMajoration, number> = {
  T_15: 15,
  T_40: 40,
  T_60: 60,
  T_100: 100,
};

export const LIBELLES_MAJORATION: Record<TypeMajoration, string> = {
  T_15: "15 % — Heures sup. semaine (jusqu'à 8h)",
  T_40: '40 % — Heures sup. semaine (au-delà de 8h)',
  T_60: '60 % — Dimanche / jour férié',
  T_100: '100 % — Heures de nuit',
};
