import { ModeHorsAffectation } from '../constants/pointage.constants';

/**
 * QR code de pointage d'une agence (`SiteClient`) — `GET /terrain/sites-clients/qr-codes`.
 * Réservé RH / SUPERADMIN : le payload suffit à imprimer un QR valide.
 */
export interface AgenceQr {
  siteId: string;
  code: string;
  nom: string;
  actif: boolean;
  /** Faux ⇒ tout scan de ce QR sera refusé (« agence non géolocalisée »). */
  geolocalise: boolean;
  latitude?: number | null;
  longitude?: number | null;
  /** Rayon effectif (défaut serveur appliqué). */
  rayonToleranceM: number;
  /** `POINTIC:AG:<token>` — ce que le serveur valide. */
  payload: string | null;
  /** Contenu imprimé dans le QR : URL du front portant le payload. */
  url: string | null;
  qrVersion: number | null;
  /** LocalDateTime ISO. */
  qrGenereLe: string | null;
}

/** Paramètres du pointage kiosque — `GET/PUT /pointages/parametres` (PUT = patch). */
export interface ParametresPointage {
  horsAffectation: ModeHorsAffectation;
  /** Faux pendant la transition : un pointage sans QR reste accepté. */
  qrObligatoire: boolean;
  dateModification?: string | null;
  modifieParNom?: string | null;
}
