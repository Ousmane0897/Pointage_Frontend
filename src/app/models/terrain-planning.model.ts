/**
 * Modèles pour le Planning des Équipes — Module Exploitation Terrain (5.2).
 *
 * Une affectation lie un agent (employeId, référence au DossierEmploye RH) à
 * un site client sur un créneau horaire. Détection de conflits si un agent
 * est affecté à deux sites se chevauchant temporellement.
 */

export type StatutAffectation =
  | 'PLANIFIEE'
  | 'EN_COURS'
  | 'EFFECTUEE'
  | 'ANNULEE'
  | 'REMPLACEE';

export interface AffectationAgent {
  id?: string;

  // Référence employé (LECTURE SEULE depuis le module RH — DossierEmploye.id)
  employeId: string;
  employeMatricule?: string;          // dénormalisation pour affichage
  employeNom?: string;                // dénormalisation pour affichage

  // Référence site
  siteId: string;
  siteCode?: string;                  // dénormalisation
  siteNom?: string;                   // dénormalisation

  // Créneau
  dateDebut: string;                  // ISO : "2026-05-26T08:00:00"
  dateFin: string;                    // ISO : "2026-05-26T12:00:00"

  statut: StatutAffectation;

  // Remplacement
  remplaceAffectationId?: string;     // si remplacement, id de l'affectation initiale
  motifRemplacement?: string;

  commentaire?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConflitAffectation {
  employeId: string;
  employeNom?: string;
  affectations: AffectationAgent[];   // au moins 2 affectations qui se chevauchent
  intervalleDebut: string;
  intervalleFin: string;
}

export interface FiltrePlanning {
  dateDebut?: string;                 // ISO yyyy-MM-dd
  dateFin?: string;
  employeId?: string;
  siteId?: string;
  statut?: StatutAffectation;
}
