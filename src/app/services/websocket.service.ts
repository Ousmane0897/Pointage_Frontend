// src/app/services/websocket.service.ts
import { Injectable } from '@angular/core';
import SockJS from 'sockjs-client';
import { Client, Message } from '@stomp/stompjs';
import { IMessage } from '@stomp/stompjs';

import { Subject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private client: Client;
  private annulationRequests$ = new Subject<any>();
  private annulationDecisions$ = new Subject<any>();
  private annulationResponses$ = new Subject<any>();

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'), // Permet à Angular (ou tout autre client) de se connecter au broker.
      reconnectDelay: 5000,
      debug: (str) => console.log('STOMP: ', str)
    });

    this.client.onConnect = (frame) => {
      console.log('STOMP connected', frame);
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
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.client.activate();
  }

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
