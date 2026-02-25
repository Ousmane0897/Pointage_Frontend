import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DashboardParAgenceService } from './dashboard-par-agence.service';
import { environment } from '../../environments/environment';

describe('DashboardParAgenceService', () => {
  let service: DashboardParAgenceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DashboardParAgenceService]
    });

    service = TestBed.inject(DashboardParAgenceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Vérifie qu'il n'y a aucune requête HTTP en attente
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch dashboard data grouped by agence', () => {
    // 🔹 Données mockées (par agence / site)
    const mockResponse = {
      "Agence Dakar": { total: 15, present: 12, absent: 3 },
      "Agence Thiès": { total: 8, present: 6, absent: 2 },
      "Agence Saint-Louis": { total: 5, present: 4, absent: 1 }
    };

    // 🔹 Appel du service
    service.getDashboardData().subscribe(data => {
      expect(data).toBeTruthy();

      expect(data['Agence Dakar'].total).toBe(15);
      expect(data['Agence Dakar'].present).toBe(12);
      expect(data['Agence Dakar'].absent).toBe(3);

      expect(data['Agence Thiès'].total).toBe(8);
      expect(data['Agence Thiès'].present).toBe(6);
      expect(data['Agence Thiès'].absent).toBe(2);
    });

    // 🔹 Vérification de la requête HTTP
    const req = httpMock.expectOne(
      `${environment.apiUrl}/api/dashboard_par_agence`
    );

    expect(req.request.method).toBe('GET');

    // 🔹 Injection de la réponse mockée
    req.flush(mockResponse);
  });
});
