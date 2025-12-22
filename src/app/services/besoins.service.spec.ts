import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BesoinsService } from './besoins.service';
import { environment } from '../../environments/environment';
import { CollecteBesoins } from '../models/CollecteBesoins.model';

describe('BesoinsService', () => {
  let service: BesoinsService;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrlEmploye;

  const mockBesoins: CollecteBesoins = {
    id: '1',
    destination: 'Dakar',
    statut: 'EN_ATTENTE'
  } as CollecteBesoins;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BesoinsService]
    });

    service = TestBed.inject(BesoinsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ===================== GET BY ID =====================
  it('should get besoins by id', () => {
    service.getById('1').subscribe(data => {
      expect(data).toEqual(mockBesoins);
    });

    const req = httpMock.expectOne(`${baseUrl}/api/besoins/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockBesoins);
  });

  // ===================== CREATE =====================
  it('should create collecte besoins with createdby', () => {
    service.createCollecteBesoins(mockBesoins, 'admin').subscribe(data => {
      expect(data).toEqual(mockBesoins);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/besoins?createdby=admin`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockBesoins);
    req.flush(mockBesoins);
  });

  // ===================== GET ALL =====================
  it('should get all collecte besoins', () => {
    service.getAllCollecteBesoins().subscribe(data => {
      expect(data.length).toBe(1);
      expect(data[0].destination).toBe('Dakar');
    });

    const req = httpMock.expectOne(`${baseUrl}/api/besoins`);
    expect(req.request.method).toBe('GET');
    req.flush([mockBesoins]);
  });

  // ===================== BY DESTINATION =====================
  it('should get besoins by destination', () => {
    service.getBesoinsByDestination('Dakar').subscribe(data => {
      expect(data.length).toBe(1);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/besoins/destination/Dakar`
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockBesoins]);
  });

  // ===================== HISTORIQUE MODIFICATIONS =====================
  it('should get historique modifications', () => {
    const historique = ['Création', 'Validation'];

    service.getHistoriqueModifications('1').subscribe(data => {
      expect(data).toEqual(historique);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/besoins/historique-modifications/1`
    );
    expect(req.request.method).toBe('GET');
    req.flush(historique);
  });

  // ===================== MOIS ACTUEL =====================
  it('should get besoins for current month', () => {
    service.getBesoinsByMoisActuel().subscribe(data => {
      expect(data.length).toBeGreaterThan(0);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/besoins/moisActuel`
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockBesoins]);
  });

  // ===================== MODIFY STATUT =====================
  it('should modify statut besoins', () => {
    service.modifyStatutBesoins('1', 'VALIDÉ', 'manager')
      .subscribe(data => {
        expect(data.statut).toBe('VALIDÉ');
      });

    const req = httpMock.expectOne(
      `${baseUrl}/api/besoins/statut/1`
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.statut).toBe('VALIDÉ');
    expect(req.request.body.modifiedBy).toBe('manager');
    req.flush({ ...mockBesoins, statut: 'VALIDÉ' });
  });

  // ===================== MODIFY COLLECTE =====================
  it('should modify collecte besoins', () => {
    service.modifyCollecteBesoins('1', mockBesoins, 'admin')
      .subscribe(data => {
        expect(data).toEqual(mockBesoins);
      });

    const req = httpMock.expectOne(
      `${baseUrl}/api/besoins/1?modifiedBy=admin`
    );
    expect(req.request.method).toBe('PUT');
    req.flush(mockBesoins);
  });

});
