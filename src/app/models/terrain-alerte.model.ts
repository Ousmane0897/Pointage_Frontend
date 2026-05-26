/**
 * Modèles pour les Alertes & Escalade — Module Exploitation Terrain (5.2).
 *
 * Alertes générées automatiquement par comparaison du planning avec les
 * pointages réels. SCOPE LIMITÉ aux agents du département "Exploitation"
 * (filtre obligatoire côté service).
 *
 * Workflow d'escalade multi-niveaux : superviseur → responsable opérationnel
 * → DG (si absence non justifiée).
 */

export type TypeAlerteTerrain =
  | 'RETARD'                  // agent n'a pas pointé à l'heure prévue
  | 'ABSENCE'                 // aucun pointage après délai
  | 'POINTAGE_HORS_ZONE'      // pointage GPS hors rayon de tolérance
  | 'DEPART_PREMATURE';       // sortie avant l'heure prévue

export type NiveauEscalade =
  | 'SUPERVISEUR'
  | 'RESPONSABLE_OPERATIONNEL'
  | 'DIRECTION_GENERALE';

export type StatutAlerte =
  | 'OUVERTE'
  | 'NOTIFIEE'
  | 'TRAITEE'
  | 'JUSTIFIEE'
  | 'ESCALADEE';

export interface AlerteTerrain {
  id?: string;
  type: TypeAlerteTerrain;
  niveauActuel: NiveauEscalade;
  statut: StatutAlerte;

  // Contexte
  employeId: string;
  employeMatricule?: string;
  employeNom?: string;
  siteId?: string;
  siteNom?: string;
  affectationId?: string;
  pointageId?: string;        // si lié à un pointage HORS_ZONE
  dateEvenement: string;      // ISO — heure attendue ou heure constatée
  dateDetection: string;      // ISO — heure de détection serveur

  // Escalade
  historiqueEscalade: EscaladeEntry[];
  destinataireActuelId?: string;       // employeId du superviseur courant
  destinataireActuelNom?: string;

  // Résolution
  commentaire?: string;
  resoluParId?: string;
  resoluParNom?: string;
  dateResolution?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface EscaladeEntry {
  niveau: NiveauEscalade;
  destinataireId?: string;
  destinataireNom?: string;
  dateEscalade: string;
  motif?: string;
}

/**
 * Paramètres globaux d'escalade configurables par les administrateurs.
 */
export interface ParametresEscalade {
  id?: string;
  delaiRetardMinutes: number;          // délai avant déclenchement RETARD
  delaiAbsenceMinutes: number;         // délai avant déclenchement ABSENCE
  delaiEscaladeNiveau1Minutes: number; // SUPERVISEUR → RESPONSABLE_OPERATIONNEL
  delaiEscaladeNiveau2Minutes: number; // RESPONSABLE_OPERATIONNEL → DIRECTION_GENERALE
  superviseursIds: string[];           // employeIds (RH) — superviseurs par défaut
  responsablesOperationnelsIds: string[];
  directionGeneraleIds: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface FiltreAlerte {
  dateDebut?: string;
  dateFin?: string;
  type?: TypeAlerteTerrain;
  statut?: StatutAlerte;
  niveauActuel?: NiveauEscalade;
  employeId?: string;
  siteId?: string;
}

export interface RecapitulatifQuotidien {
  date: string;                        // ISO yyyy-MM-dd
  nbAgentsExploitation: number;
  nbAffectations: number;
  nbRetards: number;
  nbAbsences: number;
  nbPointagesHorsZone: number;
  alertes: AlerteTerrain[];
}
