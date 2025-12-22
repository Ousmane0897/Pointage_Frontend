import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AgencesService } from './agences.service';
import { environment } from '../../environments/environment';
import { Agence } from '../models/agences.model';
import { Employe } from '../models/employe.model';

describe('AgencesService', () => {
  let service: AgencesService;
  let httpMock: HttpTestingController;

  const apiUrl = environment.apiUrlEmploye;

  const mockAgence: Agence = {
    nom: 'Agence Dakar',
    joursOuverture: 'Lundi-Vendredi'
  } as Agence;

  const mockEmploye: Employe = {
    nom: 'Diop',
    prenom: 'Ali'
  } as Employe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AgencesService]
    });

    service = TestBed.inject(AgencesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // aucune requête HTTP en attente
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ===================== GET AGENCES =====================
  it('should get agences', () => {
    service.getAgences().subscribe(data => {
      expect(data.length).toBe(1);
      expect(data[0].nom).toBe('Agence Dakar');
    });

    const req = httpMock.expectOne(`${apiUrl}/api/agences`);
    expect(req.request.method).toBe('GET');
    req.flush([mockAgence]);
  });

  // ===================== GET BY NOM =====================
  it('should get agence by nom', () => {
    service.getAgenceByNom('Agence Dakar').subscribe(data => {
      expect(data.nom).toBe('Agence Dakar');
    });

    const req = httpMock.expectOne(
      `${apiUrl}/api/agences/nom?nomAgence=Agence%20Dakar`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockAgence);
  });

  // ===================== NUMBER OF EMPLOYEES =====================
  it('should get number of employees in agence', () => {
    service.getNumberofEmployeesInOneAgence('Agence Dakar')
      .subscribe(count => {
        expect(count).toBe(10);
      });

    const req = httpMock.expectOne(
      `${apiUrl}/api/agences/getNumberofEmployeesInOneAgence?nomAgence=Agence%20Dakar`
    );
    expect(req.request.method).toBe('GET');
    req.flush(10);
  });

  // ===================== EMPLOYEE DEPLACEE =====================
  it('should get employee deplacee', () => {
    service.getEmployeeDeplacee('Agence Dakar').subscribe(emp => {
      expect(emp.nom).toBe('Diop');
    });

    const req = httpMock.expectOne(
      `${apiUrl}/api/agences/getEmployeeDeplacee?nomAgence=Agence%20Dakar`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockEmploye);
  });

  // ===================== EMPLOYEE REMPLACEE =====================
  it('should get employee remplacee', () => {
    service.getEmployeeRemplacee('Agence Dakar').subscribe(emp => {
      expect(emp.prenom).toBe('Ali');
    });

    const req = httpMock.expectOne(
      `${apiUrl}/api/agences/getEmployeeRemplacee?nomAgence=Agence%20Dakar`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockEmploye);
  });

  // ===================== MAX NUMBER =====================
  it('should get max number of employees', () => {
    service.MaxNumberOfEmployeesInOneAgence('Agence Dakar')
      .subscribe(max => {
        expect(max).toBe(20);
      });

    const req = httpMock.expectOne(
      `${apiUrl}/api/agences/MaxNumberOfEmployeesInOneAgence?nomAgence=Agence%20Dakar`
    );
    expect(req.request.method).toBe('GET');
    req.flush(20);
  });

  // ===================== JOURS OUVERTURE (map RxJS) =====================
  it('should get jours ouverture', () => {
    service.getJoursOuverture('Agence Dakar').subscribe(jours => {
      expect(jours).toBe('Lundi-Vendredi');
    });

    const req = httpMock.expectOne(
      `${apiUrl}/api/agences/Agence%20Dakar`
    );
    expect(req.request.method).toBe('GET');
    req.flush({ joursOuverture: 'Lundi-Vendredi' });
  });

  // ===================== CREATE =====================
  it('should create agence', () => {
    service.createAgence(mockAgence).subscribe(data => {
      expect(data.nom).toBe('Agence Dakar');
    });

    const req = httpMock.expectOne(`${apiUrl}/api/agences`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockAgence);
    req.flush(mockAgence);
  });

  // ===================== GET ALL SITES =====================
  it('should get all sites', () => {
    service.getAllSites().subscribe(data => {
      expect(data.length).toBe(2);
    });

    const req = httpMock.expectOne(`${apiUrl}/api/agences/sites`);
    expect(req.request.method).toBe('GET');
    req.flush(['Dakar', 'Thiès']);
  });

  // ===================== EMPLOYEES BY AGENCE =====================
  it('should get employees by agence', () => {
    service.getEmployeesByAgence('Agence Dakar').subscribe(data => {
      expect(data.length).toBe(1);
    });

    const req = httpMock.expectOne(
      `${apiUrl}/api/agences/site?nomAgence=Agence%20Dakar`
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockEmploye]);
  });

  // ===================== UPDATE =====================
  it('should update agence', () => {
    service.updateAgence('Agence Dakar', mockAgence).subscribe(data => {
      expect(data.nom).toBe('Agence Dakar');
    });

    const req = httpMock.expectOne(
      `${apiUrl}/api/agences/Agence Dakar`
    );
    expect(req.request.method).toBe('PUT');
    req.flush(mockAgence);
  });

  // ===================== DELETE =====================
  it('should delete agence', () => {
    service.deleteAgence('Agence Dakar').subscribe(response => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(
      `${apiUrl}/api/agences/Agence Dakar`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

});
