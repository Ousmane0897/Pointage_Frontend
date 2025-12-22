import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { SuperAdminComponent } from './super-admin.component';
import { WebsocketService } from '../../services/websocket.service';
import { PlanificationService } from '../../services/planification.service';
import { ToastrService } from 'ngx-toastr';
import { Planification } from '../../models/planification.model';
import { M } from '@angular/material/ripple-loader.d-C3HznB6v';

describe('SuperAdminComponent', () => {
  let component: SuperAdminComponent;
  let fixture: ComponentFixture<SuperAdminComponent>;

  let wsService: jasmine.SpyObj<WebsocketService>;
  let planifService: jasmine.SpyObj<PlanificationService>;
  let toastr: jasmine.SpyObj<ToastrService>;

  // 🔔 WebSocket simulé
  const wsSubject = new Subject<any>();

  const mockRequest = {
    planificationId: 'REQ-1',
    prenomNom: 'Ali Diop',
    motif: 'Urgence familiale'
  };

  const mockPlanification: Planification = {
    id: 'REQ-1',
    prenomNom: 'Ali Diop',
    codeSecret: 'ABC123',
    nomSite: 'Agence Dakar',
    siteDestination: ['Agence Thiès'],
    personneRemplacee: 'Moussa Fall',
    dateDebut: new Date('2025-01-15'),
    dateFin: new Date('2025-01-16'),
    matin: true,
    apresMidi: false,
    heureDebut: '08:00',
    heureFin: '17:00',
    dateDemandeAnnulation: '2025-01-10',
    statut: 'ANNULATION_ACCEPTEE',
    commentaires: 'Urgence familiale',
    motifAnnulation: 'Urgence familiale',
    dateCreation: new Date('2025-01-05'),
    joursRestants: 2
  };

  beforeEach(async () => {
    const wsSpy = jasmine.createSpyObj('WebsocketService', [
      'onAnnulationRequests'
    ]);

    const planifSpy = jasmine.createSpyObj('PlanificationService', [
      'getPendingRequests',
      'validerAnnulation'
    ]);

    const toastrSpy = jasmine.createSpyObj('ToastrService', [
      'success',
      'error',
      'info'
    ]);

    wsSpy.onAnnulationRequests.and.returnValue(wsSubject.asObservable());
    planifSpy.getPendingRequests.and.returnValue(of([mockRequest]));

    await TestBed.configureTestingModule({
      imports: [SuperAdminComponent], // ✅ standalone
      providers: [
        { provide: WebsocketService, useValue: wsSpy },
        { provide: PlanificationService, useValue: planifSpy },
        { provide: ToastrService, useValue: toastrSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminComponent);
    component = fixture.componentInstance;

    wsService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
    planifService = TestBed.inject(PlanificationService) as jasmine.SpyObj<PlanificationService>;
    toastr = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;

    // 🔕 Neutraliser le son
    spyOn<any>(component, 'playNotificationSound').and.stub();
  });

  // =====================================================
  // 1️⃣ Création
  // =====================================================
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =====================================================
  // 2️⃣ ngOnInit → chargement initial + websocket
  // =====================================================
  it('should load pending requests on init', () => {
    component.ngOnInit();

    expect(planifService.getPendingRequests).toHaveBeenCalled();
    expect(component.pendingRequests.length).toBe(1);
  });

  it('should receive websocket notification and update list', () => {
    component.ngOnInit();

    wsSubject.next(mockRequest);

    expect(component.pendingRequests[0]).toEqual(mockRequest);
    expect(toastr.info).toHaveBeenCalledWith(
      `${mockRequest.prenomNom} — ${mockRequest.motif}`,
      'Nouvelle demande d\'annulation'
    );
  });

  // =====================================================
  // 3️⃣ Getter pendingCount
  // =====================================================
  it('should return correct pending count', () => {
    component.pendingRequests = [mockRequest, mockRequest];
    expect(component.pendingCount).toBe(2);
  });

  // =====================================================
  // 4️⃣ Modale
  // =====================================================
  it('should open and close validation modal', () => {
    component.openValidationModal(mockRequest);

    expect(component.currentRequest).toEqual(mockRequest);
    expect(component.showValidationModal).toBeTrue();

    component.closeValidationModal();

    expect(component.currentRequest).toBeNull();
    expect(component.showValidationModal).toBeFalse();
  });

  // =====================================================
  // 5️⃣ Validation acceptée
  // =====================================================
  it('should validate request and remove it from list', () => {
    component.pendingRequests = [mockRequest];
    component.currentRequest = mockRequest;

    planifService.validerAnnulation.and.returnValue(of(mockPlanification));

    component.validate(true, 'REQ-1');

    expect(planifService.validerAnnulation).toHaveBeenCalledWith('REQ-1', true);
    expect(toastr.success).toHaveBeenCalledWith(
      'Annulation validée',
      'Décision envoyée'
    );
    expect(component.pendingRequests.length).toBe(0);
    expect(component.showValidationModal).toBeFalse();
  });

  // =====================================================
  // 6️⃣ Erreur validation
  // =====================================================
  it('should show error if validation fails', () => {
    planifService.validerAnnulation.and.returnValue(
      throwError(() => new Error('Erreur serveur'))
    );

    component.validate(false, 'REQ-1');

    expect(toastr.error).toHaveBeenCalledWith(
      'Erreur lors de la validation',
      'Erreur'
    );
  });

  // =====================================================
  // 7️⃣ ngOnDestroy → unsubscribe
  // =====================================================
  it('should unsubscribe all subscriptions on destroy', () => {
    component.ngOnInit();

    const unsubscribeSpy = spyOn(
      component['subs'][0],
      'unsubscribe'
    ).and.callThrough();

    component.ngOnDestroy();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
