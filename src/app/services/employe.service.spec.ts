import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmployeService } from './employe.service';
import { Employe } from '../models/employe.model';
import { Planification } from '../models/planification.model';
import { environment } from '../../environments/environment';

describe('EmployeService', () => {
  let service: EmployeService;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrl;

  // ===============================
  // 🔧 MOCKS
  // ===============================

  const employeMock: Employe = {
  codeSecret: 'EMP123',
  agentId: 'AGT123',
  nom: 'Diouf',
  prenom: 'Ousmane',
  numero: '770000000',
  intervention: 'Nettoyage',
  statut: 'ACTIF',
  employeCreePar: null,
  site: ['Dakar'],
  joursDeTravail: 'Lundi-Vendredi',
  matin: true,
  apresMidi: true,
  deplacement: false,
  remplacement: false,
  heureDebut: '08:00',
  heureFin: '17:00',
  dateEtHeureCreation: '2025-01-01T08:00:00'
};

  const planificationMock: Planification = {
    id: 'PLN1',
    prenomNom: 'Ousmane Diouf',
    codeSecret: 'EMP123',
    nomSite: 'Site A',
    siteDestination: ['Site B'],
    personneRemplacee: '',
    dateDebut: new Date(),
    dateFin: new Date(),
    heureDebut: '08:00',
    heureFin: '17:00',
    commentaires: null,
    motifAnnulation: null,
    dateCreation: new Date()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EmployeService]
    });

    service = TestBed.inject(EmployeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // 🔴 vérifie qu’aucune requête n’est oubliée
  });

  // ===============================
  // 🟢 GET TOUS LES EMPLOYÉS
  // ===============================
  it('doit récupérer la liste des employés', () => {
    service.getEmployes().subscribe((res: Employe[]) => {
      expect(res.length).toBe(1);
      expect(res[0].prenom).toBe('Ousmane');
    });

    const req = httpMock.expectOne(`${baseUrl}/api/employe`);
    expect(req.request.method).toBe('GET');

    req.flush([employeMock]);
  });

  // ===============================
  // 🟢 GET EMPLOYÉS PAR SITE
  // ===============================
  it('doit récupérer les employés d’un site', () => {
    const site = 'Dakar Plateau';

    service.getEmployeesDansUnSite(site).subscribe((res: Employe[]) => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/api/employe/employeesDansUnSite?site=${encodeURIComponent(site)}`
    );
    expect(req.request.method).toBe('GET');

    req.flush([employeMock]);
  });

  // ===============================
  // 🟢 GET EMPLOYÉ PAR CODE
  // ===============================
  it('doit récupérer un employé par codeSecret', () => {
    service.getEmployeByCodeEmploye('EMP123').subscribe((res: Employe) => {
      expect(res.codeSecret).toBe('EMP123');
    });

    const req = httpMock.expectOne(`${baseUrl}/api/employe/EMP123`);
    expect(req.request.method).toBe('GET');

    req.flush(employeMock);
  });

  // ===============================
  // 🟢 GET EMPLOYÉS EN DÉPLACEMENT
  // ===============================
  it('doit récupérer les employés en déplacement', () => {
    service.getEmployeEnDeplacement().subscribe((res: Employe[]) => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/api/employe/enDeplacement`);
    expect(req.request.method).toBe('GET');

    req.flush([employeMock]);
  });

  // ===============================
  // 🟢 UPDATE EMPLOYÉ EN DÉPLACEMENT
  // ===============================
  it('doit mettre à jour un employé en déplacement', () => {
    service.updateEmployeEnDeplacement('EMP123', planificationMock)
      .subscribe((res: Employe) => {
        expect(res.codeSecret).toBe('EMP123');
      });

    const req = httpMock.expectOne(
      `${baseUrl}/api/employe/deplacement/EMP123`
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(planificationMock);

    req.flush(employeMock);
  });

  // ===============================
  // 🟢 CREATE EMPLOYÉ
  // ===============================
  it('doit créer un employé', () => {
    service.addEmploye(employeMock).subscribe((res: Employe) => {
      expect(res.prenom).toBe('Ousmane');
    });

    const req = httpMock.expectOne(`${baseUrl}/api/employe`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(employeMock);

    req.flush(employeMock);
  });

  // ===============================
  // 🟢 UPDATE EMPLOYÉ
  // ===============================
  it('doit mettre à jour un employé', () => {
    service.updateEmploye('EMP123', employeMock).subscribe((res: Employe) => {
      expect(res.codeSecret).toBe('EMP123');
    });

    const req = httpMock.expectOne(`${baseUrl}/api/employe/EMP123`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(employeMock);

    req.flush(employeMock);
  });

  // ===============================
  // 🟢 DELETE EMPLOYÉ
  // ===============================
  it('doit supprimer un employé', () => {
    service.deleteEmploye('EMP123').subscribe((res: void) => {
      expect(res).toBeNull();
    });

    const req = httpMock.expectOne(`${baseUrl}/api/employe/EMP123`);
    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });
});
