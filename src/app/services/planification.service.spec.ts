import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { PlanificationService } from './planification.service';
import { environment } from '../../environments/environment';
import { Planification } from '../models/planification.model';
import {
  CancelRequest,
  AnnulationRequestMessage
} from './planification.service';

describe('PlanificationService', () => {
  let service: PlanificationService;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrlEmploye;

  // 🧪 Mock Planification minimal
  const planificationMock: Planification = {
    id: '1',
    prenomNom: 'Ousmane Diouf',
    codeSecret: 'ABC123',
    nomSite: 'Site A',
    siteDestination: ['Site B'],
    personneRemplacee: 'Agent X',
    dateDebut: new Date(),
    dateFin: new Date(),
    heureDebut: '08:00',
    heureFin: '16:00',
    commentaires: null,
    motifAnnulation: null,
    dateCreation: new Date(),
    statut: 'EN_COURS'
  };


  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PlanificationService]
    });

    service = TestBed.inject(PlanificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ===============================
  // 🟢 GET ALL
  // ===============================
  it('doit récupérer toutes les planifications', () => {
    service.getPlanifications().subscribe(res => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/api/planification`);
    expect(req.request.method).toBe('GET');

    req.flush([planificationMock]);
  });

  // ===============================
  // 🟢 GET BY CODE EMPLOYE
  // ===============================
  it('doit récupérer une planification par code employé', () => {
    service.getPlanificationByCodeEmploye('ABC123').subscribe(res => {
      expect(res.codeSecret).toBe('ABC123');
    });

    const req = httpMock.expectOne(`${baseUrl}/api/planification/ABC123`);
    expect(req.request.method).toBe('GET');

    req.flush(planificationMock);
  });

  // ===============================
  // 🟢 CREATE
  // ===============================
  it('doit créer une planification', () => {
    service.addPlanification(planificationMock).subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(`${baseUrl}/api/planification`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(planificationMock);

    req.flush(planificationMock);
  });

  // ===============================
  // 🟢 UPDATE
  // ===============================
  it('doit mettre à jour une planification', () => {
    service.updatePlanification('ABC123', planificationMock).subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(`${baseUrl}/api/planification/ABC123`);
    expect(req.request.method).toBe('PUT');

    req.flush(planificationMock);
  });

  // ===============================
  // 🟢 À VENIR
  // ===============================
  it('doit récupérer les planifications à venir', () => {
    service.getPlanificationsAVenir('ABC123').subscribe(res => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/planification/AVenir/ABC123`
    );
    expect(req.request.method).toBe('GET');

    req.flush([planificationMock]);
  });

  // ===============================
  // 🟢 EN COURS
  // ===============================
  it('doit récupérer les planifications en cours', () => {
    service.getPlanificationsEnCours('ABC123').subscribe(res => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/planification/EnCours/ABC123`
    );
    expect(req.request.method).toBe('GET');

    req.flush([planificationMock]);
  });

  // ===============================
  // 🟢 TERMINÉES
  // ===============================
  it('doit récupérer les planifications terminées', () => {
    service.getPlanificationsTerminees('ABC123').subscribe(res => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/planification/Terminees/ABC123`
    );
    expect(req.request.method).toBe('GET');

    req.flush([planificationMock]);
  });

  // ===============================
  // 🟢 DELETE
  // ===============================
  it('doit supprimer une planification', () => {
    service.deletePlanification('ABC123').subscribe(res => {
      expect(res).toBeNull();
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/planification/ABC123`
    );
    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });

  // ===============================
  // 🟢 DEMANDER ANNULATION
  // ===============================
  it('doit envoyer une demande d’annulation', () => {
    const payload: CancelRequest = {
      planificationId: '1',
      motif: 'Indisponibilité',
      requestedBy: 'admin'
    };

    service.demanderAnnulation(
      payload.planificationId,
      payload.motif,
      payload.requestedBy
    ).subscribe(res => {
      expect(res.planificationId).toBe('1');
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/planification/demander`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Authorization')).toBeTrue();

    req.flush(payload);
  });

  // ===============================
  // 🟢 VALIDER ANNULATION
  // ===============================
  it('doit valider une annulation', () => {
    service.validerAnnulation('1', true, 'super-admin').subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/planification/valider`
    );
    expect(req.request.method).toBe('POST');

    req.flush(planificationMock);
  });

  // ===============================
  // 🟢 DEMANDES EN ATTENTE
  // ===============================
  it('doit récupérer les demandes d’annulation en attente', () => {
    const pending: AnnulationRequestMessage[] = [
      {
        planificationId: '1',
        motif: 'Absence',
        requestedBy: 'user1',
        dateRequest: new Date().toISOString()
      }
    ];

    service.getPendingRequests().subscribe(res => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/planification/pending');
    expect(req.request.method).toBe('GET');

    req.flush(pending);
  });
});
