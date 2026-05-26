import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import {
  RAYON_TERRE_M,
  RAYON_TOLERANCE_GPS_DEFAUT_M,
  PRECISION_GPS_MAX_M,
} from '../constants/terrain.constants';
import {
  PositionGps,
  StatutPointage,
} from '../models/terrain-pointage.model';
import { CoordonneesGps } from '../models/terrain-site-client.model';

export type GeolocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNSUPPORTED';

export interface GeolocationError {
  code: GeolocationErrorCode;
  message: string;
}

/**
 * Service de Géolocalisation Terrain — Module Exploitation Terrain (5.2).
 *
 * Wrapper autour de navigator.geolocation avec :
 * - Gestion explicite des permissions et erreurs
 * - Calcul de distance Haversine entre deux coordonnées GPS (en mètres)
 * - Évaluation du statut d'un pointage selon le rayon de tolérance
 */
@Injectable({ providedIn: 'root' })
export class TerrainGeolocationService {

  /** Indique si la géolocalisation est disponible dans ce navigateur. */
  estDisponible(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Capture la position GPS actuelle de l'utilisateur. Retourne une Observable
   * qui émet une fois puis se complète.
   */
  capturerPosition(options?: PositionOptions): Observable<PositionGps> {
    if (!this.estDisponible()) {
      return throwError(
        (): GeolocationError => ({
          code: 'UNSUPPORTED',
          message: 'La géolocalisation n\'est pas supportée par ce navigateur.',
        }),
      );
    }

    return new Observable<PositionGps>((subscriber) => {
      const opts: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
        ...(options ?? {}),
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          subscriber.next({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            precisionM: pos.coords.accuracy,
            timestamp: new Date(pos.timestamp).toISOString(),
          });
          subscriber.complete();
        },
        (err) => {
          const code: GeolocationErrorCode =
            err.code === err.PERMISSION_DENIED
              ? 'PERMISSION_DENIED'
              : err.code === err.POSITION_UNAVAILABLE
                ? 'POSITION_UNAVAILABLE'
                : 'TIMEOUT';
          subscriber.error({ code, message: err.message ?? 'Erreur GPS.' });
        },
        opts,
      );
    });
  }

  /**
   * Calcule la distance en mètres entre deux coordonnées GPS via la
   * formule Haversine.
   */
  distanceHaversineM(a: CoordonneesGps, b: CoordonneesGps): number {
    const phi1 = this.degToRad(a.latitude);
    const phi2 = this.degToRad(b.latitude);
    const dPhi = this.degToRad(b.latitude - a.latitude);
    const dLambda = this.degToRad(b.longitude - a.longitude);

    const x =
      Math.sin(dPhi / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return RAYON_TERRE_M * c;
  }

  /**
   * Évalue le statut d'un pointage en comparant la position de l'agent à
   * celle du site, en tenant compte du rayon de tolérance (par défaut
   * 100m, surchargeable par site) et de la précision GPS.
   */
  evaluerStatutPointage(
    positionAgent: PositionGps,
    coordonneesSite: CoordonneesGps,
    rayonToleranceM?: number,
  ): { distanceM: number; statut: StatutPointage } {
    const distanceM = this.distanceHaversineM(positionAgent, coordonneesSite);
    const rayon = rayonToleranceM ?? RAYON_TOLERANCE_GPS_DEFAUT_M;

    if (
      positionAgent.precisionM !== undefined &&
      positionAgent.precisionM > PRECISION_GPS_MAX_M
    ) {
      return { distanceM, statut: 'GPS_IMPRECIS' };
    }
    return {
      distanceM,
      statut: distanceM <= rayon ? 'SUR_SITE' : 'HORS_ZONE',
    };
  }

  private degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
