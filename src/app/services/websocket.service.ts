import { Injectable } from '@angular/core';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private client: Client;
  private annulationRequests$ = new Subject<any>();
  private annulationDecisions$ = new Subject<any>();
  private annulationResponses$ = new Subject<any>();

  constructor() {
    const token = localStorage.getItem('token'); // Récupère le JWT depuis le localStorage
    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl), // ton API en prod ou localhost
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
}
