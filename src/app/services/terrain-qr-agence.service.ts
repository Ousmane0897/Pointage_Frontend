import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AgenceQr, ParametresPointage } from '../models/terrain-qr-agence.model';

/**
 * QR codes de pointage des agences et paramètres du pointage kiosque.
 * Habilitation RH / SUPERADMIN vérifiée côté serveur (403 sinon).
 */
@Injectable({ providedIn: 'root' })
export class TerrainQrAgenceService {

  private readonly baseUrl = environment.apiUrl;

  lister(): Observable<AgenceQr[]> {
    return this.http.get<AgenceQr[]>(`${this.baseUrl}/terrain/sites-clients/qr-codes`);
  }

  /** Nouveau jeton : l'ancien QR imprimé cesse immédiatement de fonctionner. */
  regenerer(siteId: string): Observable<AgenceQr> {
    return this.http.post<AgenceQr>(`${this.baseUrl}/terrain/sites-clients/${siteId}/qr/regenerer`, {});
  }

  getParametres(): Observable<ParametresPointage> {
    return this.http.get<ParametresPointage>(`${this.baseUrl}/pointages/parametres`);
  }

  /** Patch : un champ absent reste inchangé. */
  majParametres(patch: Partial<ParametresPointage>): Observable<ParametresPointage> {
    return this.http.put<ParametresPointage>(`${this.baseUrl}/pointages/parametres`, patch);
  }

  constructor(private http: HttpClient) {}
}
