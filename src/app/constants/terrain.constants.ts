/**
 * Constantes du module Exploitation v2 / Exploitation Terrain (5.2).
 *
 * Toutes les valeurs partagées par plusieurs composants (libellés de statut,
 * couleurs de badges, seuils, formats) sont regroupées ici.
 * AUCUNE valeur ne doit être codée en dur dans les composants.
 */

import { FrequencePassage } from '../models/terrain-site-client.model';
import { StatutAffectation } from '../models/terrain-planning.model';
import { TypePointage, StatutPointage } from '../models/terrain-pointage.model';
import {
  TypeAlerteTerrain,
  NiveauEscalade,
  StatutAlerte,
} from '../models/terrain-alerte.model';
import { StatutIntervention } from '../models/terrain-intervention.model';
import {
  DecisionControleTerrain,
} from '../models/terrain-controle-qualite.model';
import { TypeMateriel, StatutMateriel } from '../models/terrain-materiel.model';
import {
  CategoriePhyto,
  StatutApplicationPhyto,
} from '../models/terrain-phytosanitaire.model';

// ─── Dépendance RH — référence département lecture seule ───────────────────
// Seul couplage autorisé avec le module RH : filtrer les employés par
// département pour ne lister que les agents terrain. La valeur doit
// correspondre EXACTEMENT à la chaîne stockée dans DossierEmploye.departement
// (les dossiers employés rattachent les agents terrain au département
// « Opération »).
export const DEPARTEMENT_EXPLOITATION = 'Opération';

// ─── Pointage GPS ──────────────────────────────────────────────────────────
// Rayon de tolérance par défaut (mètres). Surchargeable par site via
// SiteClient.rayonToleranceM.
export const RAYON_TOLERANCE_GPS_DEFAUT_M = 100;

// Seuil maximal d'imprécision GPS accepté (mètres). Au-delà, le pointage
// est marqué GPS_IMPRECIS.
export const PRECISION_GPS_MAX_M = 50;

// Rayon de la Terre en mètres (formule Haversine).
export const RAYON_TERRE_M = 6_371_000;

// ─── Photos / Upload ───────────────────────────────────────────────────────
export const TAILLE_MAX_PHOTO_MO = 5;
export const TYPES_PHOTO_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp'];
// Compression côté client : on vise environ 500 KB par photo.
export const COMPRESSION_PHOTO_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

// ─── Sites clients : fréquence de passage ──────────────────────────────────
export const LIBELLES_FREQUENCE_PASSAGE: Record<FrequencePassage, string> = {
  QUOTIDIEN: 'Quotidien',
  HEBDOMADAIRE: 'Hebdomadaire',
  BIMENSUEL: 'Bimensuel',
  MENSUEL: 'Mensuel',
  TRIMESTRIEL: 'Trimestriel',
  PERSONNALISE: 'Personnalisé',
};

// ─── Planning : statut d'affectation ───────────────────────────────────────
export const LIBELLES_STATUT_AFFECTATION: Record<StatutAffectation, string> = {
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  EFFECTUEE: 'Effectuée',
  ANNULEE: 'Annulée',
  REMPLACEE: 'Remplacée',
};

export const COULEURS_STATUT_AFFECTATION: Record<
  StatutAffectation,
  { bg: string; text: string; border: string }
> = {
  PLANIFIEE: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  EN_COURS: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  EFFECTUEE: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  ANNULEE: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  REMPLACEE: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
};

// ─── Pointage terrain ──────────────────────────────────────────────────────
export const LIBELLES_TYPE_POINTAGE: Record<TypePointage, string> = {
  ENTREE: 'Arrivée',
  SORTIE: 'Départ',
};

export const LIBELLES_STATUT_POINTAGE: Record<StatutPointage, string> = {
  SUR_SITE: 'Sur site',
  HORS_ZONE: 'Hors zone',
  GPS_INDISPONIBLE: 'GPS indisponible',
  GPS_IMPRECIS: 'GPS imprécis',
};

export const COULEURS_STATUT_POINTAGE: Record<
  StatutPointage,
  { bg: string; text: string; border: string; icon: string }
> = {
  SUR_SITE: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    icon: 'text-emerald-600',
  },
  HORS_ZONE: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    icon: 'text-red-600',
  },
  GPS_INDISPONIBLE: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    icon: 'text-slate-500',
  },
  GPS_IMPRECIS: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    icon: 'text-amber-600',
  },
};

// ─── Alertes & escalade ────────────────────────────────────────────────────
export const LIBELLES_TYPE_ALERTE: Record<TypeAlerteTerrain, string> = {
  RETARD: 'Retard',
  ABSENCE: 'Absence',
  POINTAGE_HORS_ZONE: 'Pointage hors zone',
  DEPART_PREMATURE: 'Départ prématuré',
};

export const LIBELLES_NIVEAU_ESCALADE: Record<NiveauEscalade, string> = {
  SUPERVISEUR: 'Superviseur',
  RESPONSABLE_OPERATIONNEL: 'Responsable opérationnel',
  DIRECTION_GENERALE: 'Direction générale',
};

export const LIBELLES_STATUT_ALERTE: Record<StatutAlerte, string> = {
  OUVERTE: 'Ouverte',
  NOTIFIEE: 'Notifiée',
  TRAITEE: 'Traitée',
  JUSTIFIEE: 'Justifiée',
  ESCALADEE: 'Escaladée',
};

export const COULEURS_ALERTE: Record<
  TypeAlerteTerrain,
  { bg: string; text: string; border: string }
> = {
  RETARD: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  ABSENCE: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  POINTAGE_HORS_ZONE: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  DEPART_PREMATURE: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
};

// ─── Interventions ─────────────────────────────────────────────────────────
export const LIBELLES_STATUT_INTERVENTION: Record<StatutIntervention, string> = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  VALIDEE: 'Validée par le client',
  ANNULEE: 'Annulée',
};

export const COULEURS_STATUT_INTERVENTION: Record<
  StatutIntervention,
  { bg: string; text: string; border: string }
> = {
  BROUILLON: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  EN_COURS: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  TERMINEE: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  VALIDEE: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  ANNULEE: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300' },
};

// ─── Contrôle qualité terrain ──────────────────────────────────────────────
export const LIBELLES_DECISION_CONTROLE_TERRAIN: Record<
  DecisionControleTerrain,
  string
> = {
  CONFORME: 'Conforme',
  NON_CONFORME: 'Non conforme',
  RESERVES: 'Avec réserves',
};

export const COULEURS_DECISION_CONTROLE_TERRAIN: Record<
  DecisionControleTerrain,
  { bg: string; text: string; border: string }
> = {
  CONFORME: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  NON_CONFORME: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  RESERVES: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
};

export const NOTE_MIN_DEFAUT = 1;
export const NOTE_MAX_DEFAUT = 5;
export const SEUIL_CONFORMITE_DEFAUT = 3.5;

// ─── Matériel ──────────────────────────────────────────────────────────────
export const LIBELLES_TYPE_MATERIEL: Record<TypeMateriel, string> = {
  AUTOLAVEUSE: 'Autolaveuse',
  MONOBROSSE: 'Monobrosse',
  ASPIRATEUR: 'Aspirateur',
  NETTOYEUR_HAUTE_PRESSION: 'Nettoyeur haute pression',
  TONDEUSE: 'Tondeuse',
  DEBROUSSAILLEUSE: 'Débroussailleuse',
  PULVERISATEUR: 'Pulvérisateur',
  OUTILLAGE_MANUEL: 'Outillage manuel',
  EPI: 'EPI',
  AUTRE: 'Autre',
};

export const LIBELLES_STATUT_MATERIEL: Record<StatutMateriel, string> = {
  EN_SERVICE: 'En service',
  EN_MAINTENANCE: 'En maintenance',
  EN_PANNE: 'En panne',
  HORS_SERVICE: 'Hors service',
  EN_TRANSIT: 'En transit',
};

export const COULEURS_STATUT_MATERIEL: Record<
  StatutMateriel,
  { bg: string; text: string; border: string }
> = {
  EN_SERVICE: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  EN_MAINTENANCE: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  EN_PANNE: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  HORS_SERVICE: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  EN_TRANSIT: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
};

// Seuils d'alerte maintenance (jours avant échéance).
export const SEUIL_ALERTE_MAINTENANCE_INFO_JOURS = 30;
export const SEUIL_ALERTE_MAINTENANCE_ATTENTION_JOURS = 7;

// ─── Phytosanitaire ────────────────────────────────────────────────────────
export const LIBELLES_CATEGORIE_PHYTO: Record<CategoriePhyto, string> = {
  HERBICIDE: 'Herbicide',
  INSECTICIDE: 'Insecticide',
  FONGICIDE: 'Fongicide',
  RODENTICIDE: 'Rodenticide',
  DESINFECTANT: 'Désinfectant',
  AUTRE: 'Autre',
};

export const LIBELLES_STATUT_APPLICATION_PHYTO: Record<
  StatutApplicationPhyto,
  string
> = {
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  EFFECTUEE: 'Effectuée',
  ANNULEE: 'Annulée',
};

export const COULEURS_CATEGORIE_PHYTO: Record<CategoriePhyto, string> = {
  HERBICIDE: '#22C55E',
  INSECTICIDE: '#EF4444',
  FONGICIDE: '#3B82F6',
  RODENTICIDE: '#8B5CF6',
  DESINFECTANT: '#06B6D4',
  AUTRE: '#94A3B8',
};

// ─── Tableau de bord : palette pour les charts ─────────────────────────────
export const COULEURS_CHARTS_TERRAIN: readonly string[] = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6',
  '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316',
];

// ─── WebSocket topics ──────────────────────────────────────────────────────
export const TOPIC_ALERTES_TERRAIN = '/topic/alertes-terrain';
export const TOPIC_POINTAGES_TERRAIN = '/topic/pointages-terrain';
export const QUEUE_NOTIFICATIONS_TERRAIN = '/user/queue/notifications-terrain';
