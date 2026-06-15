import { Injectable } from '@angular/core';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AlerteTerrain } from '../models/terrain-alerte.model';
import {
  TOPIC_ALERTES_TERRAIN,
  TOPIC_POINTAGES_TERRAIN,
  QUEUE_NOTIFICATIONS_TERRAIN,
} from '../constants/terrain.constants';

/**
 * Charge utile pour les notifications ciblées du module Exploitation Terrain
 * (envoyées via `/user/queue/notifications-terrain` à un superviseur précis).
 */
export interface NotificationTerrain {
  type: 'ALERTE_OUVERTE' | 'ALERTE_ESCALADEE' | 'ALERTE_TRAITEE' | 'INFO';
  titre: string;
  message: string;
  alerteId?: string;
  niveau?: string;
  dateEmission: string;
}

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private client: Client;
  private annulationRequests$ = new Subject<any>();
  private annulationDecisions$ = new Subject<any>();
  private annulationResponses$ = new Subject<any>();

  // ─── Module Exploitation Terrain (5.2) ─────────────────────────────────
  private alertesTerrain$ = new Subject<AlerteTerrain>();
  private pointagesTerrain$ = new Subject<any>();
  private notificationsTerrain$ = new Subject<NotificationTerrain>();

  constructor() {
    const token = localStorage.getItem('token'); // Récupère le JWT depuis le localStorage

    // SockJS exige une URL absolue. En dev/local on configure wsUrl en relatif ('/ws',
    // proxifié par nginx) : on reconstruit alors l'origine courante. En prod distant,
    // wsUrl est déjà une URL absolue (https://...) → utilisée telle quelle.
    const wsUrl = environment.wsUrl.startsWith('http')
      ? environment.wsUrl
      : `${window.location.origin}${environment.wsUrl}`;

    this.client = new Client({
      webSocketFactory: () => new SockJS(wsUrl), // ton API en prod ou localhost
      reconnectDelay: 5000,
      debug: (str: string) => console.log('STOMP: ', str),
      connectHeaders: {
        Authorization: `Bearer ${token}` // ⚡ ici on passe le JWT
      }
    });

    this.client.onConnect = (frame) => {
      console.log('STOMP connecté', frame);

      // Souscriptions aux topics
      this.client.subscribe('/topic/annulationRequests', (msg: IMessage) => {
        this.annulationRequests$.next(JSON.parse(msg.body));
      });

      this.client.subscribe('/topic/annulationDecisions', (msg: IMessage) => {
        this.annulationDecisions$.next(JSON.parse(msg.body));
      });

      this.client.subscribe('/user/queue/annulationResponses', (msg: IMessage) => {
        this.annulationResponses$.next(JSON.parse(msg.body));
      });

      // ─── Module Exploitation Terrain (5.2) ─────────────────────────────
      this.client.subscribe(TOPIC_ALERTES_TERRAIN, (msg: IMessage) => {
        try {
          this.alertesTerrain$.next(JSON.parse(msg.body) as AlerteTerrain);
        } catch (e) {
          console.error('Payload alerte terrain invalide', e);
        }
      });

      this.client.subscribe(TOPIC_POINTAGES_TERRAIN, (msg: IMessage) => {
        try {
          this.pointagesTerrain$.next(JSON.parse(msg.body));
        } catch (e) {
          console.error('Payload pointage terrain invalide', e);
        }
      });

      this.client.subscribe(QUEUE_NOTIFICATIONS_TERRAIN, (msg: IMessage) => {
        try {
          this.notificationsTerrain$.next(JSON.parse(msg.body) as NotificationTerrain);
        } catch (e) {
          console.error('Payload notification terrain invalide', e);
        }
      });
    };

    this.client.onStompError = (frame) => {
      console.error('Erreur du broker STOMP:', frame.headers['message']);
      console.error('Détails supplémentaires:', frame.body);
    };

    // Activation du client
    this.client.activate();
  }

  // Observables exposés pour les composants
  onAnnulationRequests(): Observable<any> {
    return this.annulationRequests$.asObservable();
  }

  onAnnulationDecisions(): Observable<any> {
    return this.annulationDecisions$.asObservable();
  }

  onAnnulationResponses(): Observable<any> {
    return this.annulationResponses$.asObservable();
  }

  // ─── Module Exploitation Terrain (5.2) ───────────────────────────────────

  /** Flux temps réel des alertes terrain (broadcast superviseurs). */
  onAlertesTerrain(): Observable<AlerteTerrain> {
    return this.alertesTerrain$.asObservable();
  }

  /** Flux temps réel des pointages terrain (optionnel — broadcast). */
  onPointagesTerrain(): Observable<any> {
    return this.pointagesTerrain$.asObservable();
  }

  /** Notifications ciblées (queue utilisateur) — escalade vers le destinataire. */
  onNotificationsTerrain(): Observable<NotificationTerrain> {
    return this.notificationsTerrain$.asObservable();
  }
}
