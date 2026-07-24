/**
 * Paramètres globaux du module Production Chimie (document singleton côté serveur).
 * Porte notamment la tolérance de contrôle du total d'une formulation (Fonction C).
 */
export interface ParametresProductionChimie {
  id?: string;
  toleranceTotalPct: number; // tolérance ± % entre total saisi et taille du lot (défaut 0,1)
  updatedAt?: string;
  updatedBy?: string;
}
