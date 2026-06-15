/**
 * Modèles pour le Référentiel Sites Clients — Module Exploitation Terrain (5.2).
 *
 * Un site client représente un lieu d'intervention récurrent (immeuble,
 * espace vert, copropriété, site industriel) avec coordonnées GPS pour
 * vérification de présence terrain (pointage GPS avec formule Haversine).
 */

export type FrequencePassage =
  | 'QUOTIDIEN'
  | 'HEBDOMADAIRE'
  | 'BIMENSUEL'
  | 'MENSUEL'
  | 'TRIMESTRIEL'
  | 'PERSONNALISE';

export interface ContactClient {
  nom: string;
  fonction?: string;
  telephone: string;
  email?: string;
}

export interface CoordonneesGps {
  latitude: number;            // décimal, ex: 14.6928
  longitude: number;           // décimal, ex: -17.4467
}

export interface SiteClient {
  id?: string;
  code: string;                // référence unique métier, ex: SITE-DKR-001
  nom: string;                 // dénomination du site
  raisonSociale?: string;      // entreprise cliente

  // Localisation
  adresse: string;
  ville: string;
  pays?: string;
  coordonnees?: CoordonneesGps; // optionnel : conservé pour l'ancien pointage GPS (fiche-pointage), plus saisi côté site
  rayonToleranceM?: number;    // surcharge du rayon GPS par défaut (100m)

  // Contact
  contactPrincipal: ContactClient;
  contactsSecondaires?: ContactClient[];

  // Cahier des charges
  cahierDesCharges?: string;          // texte enrichi (description, consignes)
  cahierDesChargesUrl?: string;       // PDF uploadé
  cahierDesChargesNomFichier?: string;

  // Caractéristiques techniques
  surfaceM2?: number;
  frequencePassage: FrequencePassage;
  frequencePersonnalisee?: string;    // si PERSONNALISE — texte libre (ex: "lundi/mercredi/vendredi")
  specificites?: string;              // observations techniques libres

  actif: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FiltreSiteClient {
  q?: string;                  // recherche libre (code/nom/ville)
  ville?: string;
  frequencePassage?: FrequencePassage;
  actif?: boolean;
}
