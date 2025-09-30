import { Injectable } from '@angular/core';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private client: Client;
  private annulationRequests$ = new Subject<any>();
  private annulationDecisions$ = new Subject<any>();
  private annulationResponses$ = new Subject<any>();

  constructor() {
    this.client = new Client({
      // Utilise SockJS pour le navigateur
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      debug: (str: string) => console.log('STOMP: ', str)
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
