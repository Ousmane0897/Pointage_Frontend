import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { NotificationComponent } from './notification.component';
import { WebsocketService } from '../../services/websocket.service';

describe('NotificationComponent', () => {
  let component: NotificationComponent;
  let fixture: ComponentFixture<NotificationComponent>;
  let wsService: jasmine.SpyObj<WebsocketService>;

  // 🔹 Subjects pour simuler les flux WebSocket
  const annulationRequests$ = new Subject<any>();
  const annulationDecisions$ = new Subject<any>();
  const annulationResponses$ = new Subject<any>();

  beforeEach(async () => {
    wsService = jasmine.createSpyObj('WebsocketService', [
      'onAnnulationRequests',
      'onAnnulationDecisions',
      'onAnnulationResponses'
    ]);

    wsService.onAnnulationRequests.and.returnValue(annulationRequests$);
    wsService.onAnnulationDecisions.and.returnValue(annulationDecisions$);
    wsService.onAnnulationResponses.and.returnValue(annulationResponses$);

    await TestBed.configureTestingModule({
      imports: [NotificationComponent],
      providers: [{ provide: WebsocketService, useValue: wsService }]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationComponent);
    component = fixture.componentInstance;

    // 🔇 Mock de l’audio (évite erreur navigateur)
    spyOn(component as any, 'playNotificationSound');

    fixture.detectChanges(); // déclenche ngOnInit
  });

  // =====================================================
  // 1️⃣ Création
  // =====================================================
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =====================================================
  // 2️⃣ Réception d’une nouvelle demande
  // =====================================================
  it('should add a new pending request and update count', () => {
    const request = { id: 'REQ1', motif: 'Urgent' };

    annulationRequests$.next(request);

    expect(component.pendingRequests.length).toBe(1);
    expect(component.pendingCount).toBe(1);
    expect((component as any).playNotificationSound).toHaveBeenCalled();
  });

  // =====================================================
  // 3️⃣ Éviter les doublons
  // =====================================================
  it('should not add duplicate requests', () => {
    const request = { id: 'REQ1' };

    annulationRequests$.next(request);
    annulationRequests$.next(request); // même id

    expect(component.pendingRequests.length).toBe(1);
    expect(component.pendingCount).toBe(1);
  });

  // =====================================================
  // 4️⃣ validate() → suppression
  // =====================================================
  it('should remove request after validation', () => {
    component.pendingRequests = [
      { id: 'REQ1' },
      { id: 'REQ2' }
    ];
    component.pendingCount = 2;

    component.validate(true, 'REQ1');

    expect(component.pendingRequests.length).toBe(1);
    expect(component.pendingRequests[0].id).toBe('REQ2');
    expect(component.pendingCount).toBe(1);
  });

  // =====================================================
  // 5️⃣ Modale
  // =====================================================
  it('should open and close validation modal', () => {
    component.openModal();
    expect(component.showValidationModal).toBeTrue();

    component.closeValidationModal();
    expect(component.showValidationModal).toBeFalse();
  });

  // =====================================================
  // 6️⃣ ngOnDestroy → unsubscribe
  // =====================================================
  it('should unsubscribe from all subscriptions on destroy', () => {
    const spy = spyOn(component['subs'][0], 'unsubscribe').and.callThrough();

    component.ngOnDestroy();

    expect(spy).toHaveBeenCalled();
  });
});
