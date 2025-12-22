import { TestBed } from '@angular/core/testing';
import { WebsocketService } from './websocket.service';
import { Client, IMessage } from '@stomp/stompjs';

// ===============================
// 🔴 MOCK SockJS (global)
// ===============================
(window as any).SockJS = function () {
  return {};
};

// ===============================
// 🔴 MOCK STOMP CLIENT
// ===============================
class MockStompClient {
  onConnect!: Function;
  onStompError!: Function;

  activate = jasmine.createSpy('activate');
  subscribe = jasmine.createSpy('subscribe');
}

describe('WebsocketService (Jasmine)', () => {
  let service: WebsocketService;
  let stompClientInstance: MockStompClient;

  beforeEach(() => {
    // 🧠 Intercepter la création du Client STOMP
    spyOn<any>(Client.prototype, 'activate').and.callFake(() => {
      // rien à faire ici, activation simulée
    });

    // ⚠️ On remplace directement le Client dans le service
    spyOn<any>(Client.prototype, 'constructor').and.callFake(() => {
      stompClientInstance = new MockStompClient();
      return stompClientInstance;
    });

    TestBed.configureTestingModule({
      providers: [WebsocketService]
    });

    service = TestBed.inject(WebsocketService);

    // ⚠️ Récupération directe du client créé dans le service
    stompClientInstance = (service as any).client;
  });

  // ===============================
  // 🟢 INITIALISATION
  // ===============================

  it('doit créer le service et activer STOMP', () => {
    expect(service).toBeTruthy();
    expect(stompClientInstance.activate).toHaveBeenCalled();
  });

  // ===============================
  // 🟢 SUBSCRIPTIONS STOMP
  // ===============================

  it('doit souscrire aux topics à la connexion', () => {
    stompClientInstance.onConnect({});

    expect(stompClientInstance.subscribe).toHaveBeenCalledWith(
      '/topic/annulationRequests',
      jasmine.any(Function)
    );

    expect(stompClientInstance.subscribe).toHaveBeenCalledWith(
      '/topic/annulationDecisions',
      jasmine.any(Function)
    );

    expect(stompClientInstance.subscribe).toHaveBeenCalledWith(
      '/user/queue/annulationResponses',
      jasmine.any(Function)
    );
  });

  // ===============================
  // 🟢 ÉMISSION DES DONNÉES
  // ===============================

  it('doit émettre une annulation request', (done) => {
    let callback!: Function;

    stompClientInstance.subscribe.and.callFake((_, cb) => {
      callback = cb;
    });

    stompClientInstance.onConnect({});

    service.onAnnulationRequests().subscribe((data) => {
      expect(data).toEqual({ id: 1 });
      done();
    });

    callback({ body: JSON.stringify({ id: 1 }) } as IMessage);
  });

  it('doit émettre une annulation decision', (done) => {
    let callback!: Function;

    stompClientInstance.subscribe.and.callFake((_, cb) => {
      callback = cb;
    });

    stompClientInstance.onConnect({});

    service.onAnnulationDecisions().subscribe((data) => {
      expect(data).toEqual({ decision: 'OK' });
      done();
    });

    callback({ body: JSON.stringify({ decision: 'OK' }) } as IMessage);
  });

  it('doit émettre une annulation response', (done) => {
    let callback!: Function;

    stompClientInstance.subscribe.and.callFake((_, cb) => {
      callback = cb;
    });

    stompClientInstance.onConnect({});

    service.onAnnulationResponses().subscribe((data) => {
      expect(data).toEqual({ status: 'DONE' });
      done();
    });

    callback({ body: JSON.stringify({ status: 'DONE' }) } as IMessage);
  });

  // ===============================
  // 🔴 ERREUR STOMP
  // ===============================

  it('doit gérer une erreur STOMP sans planter', () => {
    spyOn(console, 'error');

    stompClientInstance.onStompError({
      headers: { message: 'Broker error' },
      body: 'Erreur critique'
    });

    expect(console.error).toHaveBeenCalled();
  });
});
