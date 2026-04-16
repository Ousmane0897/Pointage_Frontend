/**
 * Modèle de données pour le Pointage Centralisé – Temps & Présences
 * Vue agrégée des pointages (remontés du module Exploitation) pour tout le personnel.
 */

export type StatutPresence = 'PRESENT' | 'ABSENT' | 'RETARD' | 'CONGE';

export interface PointageCentralise {
  id?: string;

  // Référence employé (reprend les champs clés de DossierEmploye)
  employeId: string;
  matricule: string;
  nom: string;
  prenom: string;
  departement: string;
  site: string;
  poste?: string;

  // Pointage
  date: string;                    // ISO yyyy-MM-dd
  heureArrivee?: string | null;    // HH:mm
  heureDepart?: string | null;     // HH:mm
  dureeMinutes?: number;           // durée travaillée en minutes
  retardMinutes?: number;          // minutes de retard à l'arrivée
  statut: StatutPresence;
  motif?: string;                  // motif absence / retard si pertinent
}

export interface FiltrePointage {
  date?: string;              // yyyy-MM-dd (défaut : aujourd'hui)
  dateDebut?: string;
  dateFin?: string;
  departement?: string;
  site?: string;
  statut?: StatutPresence;
  q?: string;                 // recherche nom / matricule
}

export interface ResumeJournee {
  date: string;
  totalEmployes: number;
  presents: number;
  absents: number;
  retards: number;
  enConge: number;
}
