export interface Pointage {
    id: string;
    codeSecret: string;
    prenom: string;
    nom: string;
    date: string;
    heureArrive: string;
    heureDepart: string;
    duree: string;
    status: string;
    site: string[];
    adresse: string;

    // --- QR code d'agence (absents sur les pointages antérieurs ou pointés sans QR) ---
    // L'agence est stockée par référence ; son nom n'est fourni que par les lectures.
    agenceId?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    precisionMetres?: number | null;
    distanceMetres?: number | null;
    /** Agence du départ — peut légitimement différer de celle d'arrivée. */
    agenceIdSortie?: string | null;
    latitudeSortie?: number | null;
    longitudeSortie?: number | null;
    precisionMetresSortie?: number | null;
    distanceMetresSortie?: number | null;
    /** Codes `AnomaliePointage` (cf. pointage.constants.ts), informatifs. */
    anomalies?: string[] | null;

    /** Noms résolus à la lecture (`/pointages/today`, `/historique/search`). */
    agenceArriveeNom?: string | null;
    agenceDepartNom?: string | null;
}

/**
 * Réponse de `POST /pointages` : le pointage, plus ce que le scan courant a établi.
 * `agenceNom` / `distanceMetres` désignent l'agence **du scan courant** (pour une
 * sortie, l'agence de départ). Nuls pour un pointage sans QR.
 */
export interface PointageResultat extends Pointage {
    type: 'ENTREE' | 'SORTIE';
    horodatage?: string;
    agenceNom?: string | null;
    avertissement?: string | null;
}

/** Corps de `POST /pointages`. */
export interface PointagePayload {
    codeSecret: string;
    deviceId?: string;
    latitude?: number;
    longitude?: number;
    precisionMetres?: number;
    /** `POINTIC:AG:<token>` relayé tel quel depuis l'URL scannée. */
    qrPayload?: string | null;
}

/** État de navigation transmis aux pages de confirmation. */
export interface ConfirmationPointage {
    type: 'ENTREE' | 'SORTIE';
    heure: string;
    agenceNom?: string | null;
    avertissement?: string | null;
}
