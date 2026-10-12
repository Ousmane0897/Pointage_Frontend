/**
 * Constantes du pointage kiosque par QR code d'agence.
 *
 * Le QR imprimé encode une URL `<front>/home?qr=POINTIC:AG:<token>` : l'appareil photo
 * natif ouvre l'application, qui mémorise le payload et le renvoie tel quel au serveur
 * avec le PIN. C'est le serveur qui valide le payload — rien n'est décidé ici.
 */

/** Paramètre d'URL portant le payload du QR. */
export const PARAM_QR_POINTAGE = 'qr';

/** Préfixe du payload ; un QR qui ne le porte pas est « non reconnu » (serveur). */
export const PREFIXE_QR_AGENCE = 'POINTIC:AG:';

/**
 * Durée de validité d'un scan mémorisé. Au-delà, le pointage part **sans** QR :
 * sinon un départ effectué ailleurs, longtemps après l'arrivée, serait attribué à
 * l'agence d'arrivée.
 */
export const TTL_QR_POINTAGE_MS = 10 * 60 * 1000;

/** Clé de stockage (sessionStorage : propre à l'onglet, perdu à sa fermeture). */
export const CLE_QR_POINTAGE = 'pointic.qrAgence';

/** Libellé d'un pointage sans agence (antérieur au QR d'agence, ou pointé sans QR). */
export const AGENCE_NON_RENSEIGNEE = 'Agence non renseignée';

/** Nom d'agence à afficher : le nom résolu, ou « Agence non renseignée ». */
export function libelleAgence(nom: string | null | undefined): string {
  return nom && nom.trim() ? nom : AGENCE_NON_RENSEIGNEE;
}

/** Valeur du filtre « agence » désignant les pointages sans agence (contrat serveur). */
export const FILTRE_AGENCE_AUCUNE = 'AUCUNE';

export type AnomaliePointage =
  | 'HORS_AFFECTATION_ENTREE'
  | 'HORS_AFFECTATION_SORTIE'
  | 'PRECISION_FAIBLE_ENTREE'
  | 'PRECISION_FAIBLE_SORTIE';

/** Anomalies informatives (le pointage a été accepté). */
export const LIBELLES_ANOMALIE_POINTAGE: Record<AnomaliePointage, string> = {
  HORS_AFFECTATION_ENTREE: 'Arrivée hors affectation',
  HORS_AFFECTATION_SORTIE: 'Départ hors affectation',
  PRECISION_FAIBLE_ENTREE: 'GPS imprécis à l\'arrivée',
  PRECISION_FAIBLE_SORTIE: 'GPS imprécis au départ',
};

export function libelleAnomaliePointage(code: string): string {
  return LIBELLES_ANOMALIE_POINTAGE[code as AnomaliePointage] ?? code;
}

/** Mode du contrôle « pointage hors agence d'affectation » (paramètre serveur). */
export type ModeHorsAffectation = 'BLOQUER' | 'AVERTIR' | 'AUTORISER';

export const OPTIONS_HORS_AFFECTATION: { valeur: ModeHorsAffectation; libelle: string; description: string }[] = [
  { valeur: 'AVERTIR', libelle: 'Avertir', description: 'Pointage accepté, signalé comme anomalie consultable par la RH.' },
  { valeur: 'BLOQUER', libelle: 'Bloquer', description: 'Pointage refusé hors des agences d\'affectation.' },
  { valeur: 'AUTORISER', libelle: 'Autoriser', description: 'Aucun contrôle d\'affectation.' },
];
