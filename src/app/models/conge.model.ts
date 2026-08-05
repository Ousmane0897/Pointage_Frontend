/**
 * Modèle de données pour le Calendrier des Congés – Temps & Présences.
 *
 * Circuit de validation à 3 niveaux (séquentiel, obligatoire) :
 *   EN_ATTENTE_SUPERIEUR → EN_ATTENTE_RH → EN_ATTENTE_DG → APPROUVE
 *
 * Niveau 1 = le supérieur hiérarchique du demandeur (un employé, pas un rôle).
 * Niveau 2 = le rôle `RH`. Niveau 3 = le rôle `SUPERADMIN` (la Direction
 * générale *est* le super-admin). Un refus à n'importe quel niveau est
 * terminal (`REFUSE`) et impose un motif.
 *
 * ⚠ Le front ne recalcule jamais l'habilitation à partir des données : il
 * consomme `DemandeConge.peutValiderParMoi` et `MonProfilConge.niveauxValidables`,
 * tous deux calculés serveur. `CongePermissionsService` n'est qu'une commodité
 * d'interface (masquage des actions) — l'autorisation fait foi côté serveur.
 */

export type TypeConge =
  | 'ANNUEL'
  | 'MATERNITE'
  | 'PATERNITE'
  | 'SANS_SOLDE'
  | 'EXCEPTIONNEL';

/**
 * Statut du circuit de validation.
 *
 * `EN_ATTENTE` est conservé pour les demandes créées avant le workflow à
 * 3 niveaux : le front le tolère en lecture et le traite comme
 * `EN_ATTENTE_SUPERIEUR` (cf. `NIVEAU_PAR_STATUT`).
 */
export type StatutDemande =
  /** @deprecated legacy mono-niveau — traité comme `EN_ATTENTE_SUPERIEUR`. */
  | 'EN_ATTENTE'
  | 'EN_ATTENTE_SUPERIEUR'
  | 'EN_ATTENTE_RH'
  | 'EN_ATTENTE_DG'
  | 'APPROUVE'
  | 'REFUSE'
  | 'ANNULE';

/** Niveau du circuit. `DIRECTION_GENERALE` est porté par le rôle `SUPERADMIN`. */
export type NiveauValidation = 'SUPERIEUR' | 'RH' | 'DIRECTION_GENERALE';

/** Action tracée dans l'historique du circuit. */
export type ActionValidationConge =
  | 'CREATION'
  | 'VALIDATION'
  | 'REFUS'
  | 'ANNULATION'
  | 'MODIFICATION';

/**
 * Entrée d'historique : qui a fait quoi, à quel niveau, quand.
 * Calquée sur `HistoriqueWorkflow` (Stock v2 / 7.4).
 */
export interface HistoriqueValidationConge {
  action: ActionValidationConge;
  /** Absent pour `CREATION` / `ANNULATION`. */
  niveau?: NiveauValidation;
  auteurId?: string;
  /** Dénormalisé serveur depuis le JWT. */
  auteurNom?: string;
  /** ISO complet. */
  date: string;
  commentaire?: string;
}

/** Décision rendue à un niveau donné — bloc répété 3 fois sur la demande. */
export interface DecisionNiveau {
  decideurId?: string;
  decideurNom?: string;
  /** ISO complet. */
  date?: string;
  commentaire?: string;
}

export interface SoldeConge {
  employeId: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  departement?: string;
  anneeReference: number;
  acquis: number;      // jours acquis
  pris: number;        // jours pris
  enCours: number;     // jours en demande en attente
  solde: number;       // jours restants
}

export interface DemandeConge {
  id?: string;

  // Référence employé
  employeId: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  departement?: string;

  // Demande
  type: TypeConge;
  dateDebut: string;          // yyyy-MM-dd
  dateFin: string;            // yyyy-MM-dd
  nombreJours?: number;
  motif?: string;

  // ─── Workflow 3 niveaux ─────────────────────────────────────────────────
  statut: StatutDemande;
  /** Dérivable du statut ; envoyé par le serveur par confort d'affichage. */
  niveauCourant?: NiveauValidation;
  dateDemande?: string;

  /**
   * Validateur de niveau 1, dénormalisé **et figé** à la création : un
   * changement d'organigramme ne doit jamais rerouter une demande en vol.
   */
  superieurHierarchiqueId?: string;
  superieurHierarchiqueNom?: string;
  /** true si le demandeur n'a pas de supérieur : le circuit démarre à la RH. */
  niveauSuperieurIgnore?: boolean;

  decisionSuperieur?: DecisionNiveau;
  decisionRh?: DecisionNiveau;
  decisionDg?: DecisionNiveau;

  /** Renseignés uniquement si `statut === 'REFUSE'`. */
  niveauRefus?: NiveauValidation;
  motifRefus?: string;

  historique?: HistoriqueValidationConge[];

  /**
   * Calculé serveur pour l'appelant courant : autorité unique pour afficher
   * les boutons Valider / Refuser. Absent tant que le backend n'expose pas le
   * champ ⇒ repli de `CongePermissionsService.peutValiderNiveau`.
   */
  peutValiderParMoi?: boolean;

  // ─── Legacy (ancien workflow mono-niveau) — lecture seule ────────────────
  /** @deprecated remplacé par `decision*` / `historique`. */
  dateDecision?: string;
  /** @deprecated remplacé par `decision*` / `historique`. */
  decideurId?: string;
  /** @deprecated remplacé par `decision*` / `historique`. */
  decideurNom?: string;
  /** @deprecated remplacé par `decision*` / `historique`. */
  commentaireDecision?: string;
}

/**
 * Corps de création d'une demande.
 *
 * Pas de `statut` : le serveur pose `EN_ATTENTE_SUPERIEUR` (ou `EN_ATTENTE_RH`
 * si le demandeur n'a pas de supérieur). `employeId` est optionnel : absent, le
 * demandeur est résolu depuis l'e-mail du JWT ; présent, il n'est accepté que
 * des profils `RH` / `SUPERADMIN` (403 sinon).
 */
export interface CreationDemandePayload {
  employeId?: string;
  type: TypeConge;
  dateDebut: string;
  dateFin: string;
  motif?: string;
}

/**
 * Identité métier de l'utilisateur connecté, résolue serveur depuis l'e-mail
 * du JWT — celui-ci ne portant ni `id` ni `employeId`.
 */
export interface MonProfilConge {
  /** Absent si le compte n'est rattaché à aucun dossier employé. */
  employeId?: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  email: string;
  departement?: string;
  superieurHierarchiqueId?: string;
  superieurHierarchiqueNom?: string;
  /** Niveaux que l'appelant peut valider (subordonnés + rôles), calculé serveur. */
  niveauxValidables: NiveauValidation[];
  /** Demandes en attente de son action, tous niveaux confondus. */
  nbDemandesAValider?: number;
}

/** Compteurs de la file de validation de l'appelant. */
export interface CompteursAValider {
  total: number;
  parNiveau: Record<NiveauValidation, number>;
}

/**
 * Charge utile des notifications temps réel
 * (`/topic/conges-validations` en broadcast,
 * `/user/queue/notifications-conges` ciblée vers le validateur attendu).
 */
export interface NotificationValidationConge {
  type:
    | 'DEMANDE_SOUMISE'
    | 'DEMANDE_VALIDEE_NIVEAU'
    | 'DEMANDE_APPROUVEE'
    | 'DEMANDE_REFUSEE'
    | 'DEMANDE_ANNULEE'
    | 'INFO';
  demandeId: string;
  employeId?: string;
  employeNom?: string;
  /** Niveau qui vient d'agir, ou niveau désormais attendu. */
  niveau?: NiveauValidation;
  statut?: StatutDemande;
  titre: string;
  message: string;
  dateEmission: string;
}

export interface FiltreConge {
  employeId?: string;
  departement?: string;
  statut?: StatutDemande;
  /** Multi-statuts (param `statut` répété) — ex. « tout ce qui est en cours ». */
  statuts?: StatutDemande[];
  niveau?: NiveauValidation;
  type?: TypeConge;
  dateDebut?: string;
  dateFin?: string;
  q?: string;
}
