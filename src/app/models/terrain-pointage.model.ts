/**
 * Modèles pour le Pointage Terrain — Module Exploitation Terrain (5.2).
 *
 * Pointage GPS d'arrivée/départ d'un agent sur un site client. La distance
 * agent ↔ site est calculée via la formule Haversine ; au-delà du rayon de
 * tolérance (par défaut 100m, surchargeable par site), le pointage est
 * marqué HORS_ZONE et déclenche une alerte au superviseur.
 *
 * INDÉPENDANT de tout autre modèle de pointage existant dans le projet.
 */

import { PageResponse } from './pageResponse.model';

export type TypePointage = 'ENTREE' | 'SORTIE';

export type StatutPointage =
  | 'SUR_SITE'                // dans le rayon de tolérance
  | 'HORS_ZONE'               // hors rayon — alerte déclenchée
  | 'GPS_INDISPONIBLE'        // permission refusée ou navigateur incompatible
  | 'GPS_IMPRECIS';           // précision > seuil (ex: 50m)

export interface PositionGps {
  latitude: number;
  longitude: number;
  precisionM?: number;        // accuracy en mètres
  timestamp: string;          // ISO de capture
}

export interface PointageTerrain {
  id?: string;

  // Agent (référence RH lecture seule)
  employeId: string;
  employeMatricule?: string;
  employeNom?: string;

  // Site
  siteId: string;
  siteCode?: string;
  siteNom?: string;

  // Affectation source (optionnelle — un pointage peut être hors planning)
  affectationId?: string;

  type: TypePointage;
  datePointage: string;       // ISO horodatage serveur
  positionAgent: PositionGps;
  distanceM?: number;         // distance calculée à la coordonnée du site
  statut: StatutPointage;

  commentaire?: string;       // pour les pointages hors zone
  createdAt?: string;
}

export interface FiltrePointageTerrain {
  dateDebut?: string;
  dateFin?: string;
  employeId?: string;
  siteId?: string;
  type?: TypePointage;
  statut?: StatutPointage;
}

export type PagePointageTerrain = PageResponse<PointageTerrain>;
