import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmployeCompletService, ImportEmployeResponse } from './employe-complet.service';
import { environment } from '../../environments/environment';
import { EmployeComplet } from '../models/employe-complet.model';
import { M } from '@angular/material/ripple-loader.d-C3HznB6v';

describe('EmployeCompletService', () => {
  let service: EmployeCompletService;
  let httpMock: HttpTestingController;

  const MOCK_EMPLOYE: EmployeComplet = {

    id: '1',
    agentId: 'AG-001',
    matricule: 'M-001',
    prenom: 'John',
    nom: 'Doe',
    sexe: 'M',
    heureDebut: '08:00',
    heureFin: '17:00',
    dateNaissance: new Date('1990-01-01'),
    lieuNaissance: 'Dakar',
    nationalite: 'Sénégalaise',
    etatCivil: 'Célibataire',
    adresse: 'Rue Exemple, Dakar',
    ville: 'Dakar',
    telephone1: '770000000',
    contactUrgence: 'Jane Doe',
    lienDeParenteAvecContactUrgence: 'Sœur',
    telephoneUrgent: '770000001',
    agence: ['Agence A'],
    poste: 'Employé',
    typeContrat: 'CDI',
    dateEmbauche: new Date('2020-01-01'),
    tempsDeTravail: '40h',
    horaire: '08:00-17:00',
    salaireDeBase: '500000',
    permisConduire: 'OUI',
    statut: 'ACTIF'
  };


  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EmployeCompletService]
    });

    service = TestBed.inject(EmployeCompletService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Vérifie qu'aucune requête n'est en attente
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should search employes', () => {
    const mockResponse = { content: [MOCK_EMPLOYE], total: 1 };

    service.searchEmployes('John').subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrlEmploye}/api/employe-complet/search?q=John`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });


  it('should get employe by agentId', () => {

    service.getEmployeCompletByAgentId('1').subscribe((res) => {
      expect(res).toEqual(MOCK_EMPLOYE);
    });

    const req = httpMock.expectOne(`${environment.apiUrlEmploye}/api/employe-complet/1`);
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_EMPLOYE);
  });

  it('should create employe', () => {
    const formData = new FormData();
    formData.append('nom', 'Doe');
    formData.append('prenom', 'John');

    const mockResponse = { message: 'Employe created' };

    service.createEmployeComplet(formData).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrlEmploye}/api/employe-complet/employe`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should update employe', () => {
    const formData = new FormData();
    formData.append('nom', 'DoeUpdated');

    service.updateEmployeComplet('1', formData).subscribe((res) => {
      expect(res).toEqual(MOCK_EMPLOYE);
    });

    const req = httpMock.expectOne(`${environment.apiUrlEmploye}/api/employe-complet/complet/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(MOCK_EMPLOYE);
  });

  it('should delete employe', () => {
    service.deleteEmploye('1').subscribe((res) => {
      expect(res).toBeNull();
    });

    const req = httpMock.expectOne(`${environment.apiUrlEmploye}/api/employe-complet/by-agent/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should import employes', () => {

    const mockResponse: ImportEmployeResponse = { success: [MOCK_EMPLOYE], errors: [] };

    service.importEmployes([MOCK_EMPLOYE]).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrlEmploye}/api/employe-complet/import-excel`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
});
