import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DashboardService } from './dashboard.service';
import { environment } from '../../environments/environment';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DashboardService]
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Vérifie qu'il n'y a pas de requêtes HTTP non traitées
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch dashboard data', () => {
    // 🔹 Données mockées
    const mockResponse = {
      total: 10,
      present: 7,
      absent: 3
    };

    // 🔹 Appel du service
    service.getDashboardData().subscribe(data => {
      expect(data).toBeTruthy();
      expect(data.total).toBe(10);
      expect(data.present).toBe(7);
      expect(data.absent).toBe(3);
    });

    // 🔹 Vérification de la requête HTTP
    const req = httpMock.expectOne(
      `${environment.apiUrlEmploye}/api/dashboard`
    );

    expect(req.request.method).toBe('GET');

    // 🔹 Retour de la réponse mockée
    req.flush(mockResponse);
  });
});
