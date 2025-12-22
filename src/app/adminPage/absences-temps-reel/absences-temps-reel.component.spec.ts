import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbsencesTempsReelComponent } from './absences-temps-reel.component';
import { AbsencesService } from '../../services/absences.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { Absent } from '../../models/absent.model';

describe('AbsencesTempsReelComponent', () => {
  let component: AbsencesTempsReelComponent;
  let fixture: ComponentFixture<AbsencesTempsReelComponent>;

  let absencesSpy: jasmine.SpyObj<AbsencesService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  // 🔹 Mock Absent STRICT (adapter si ton modèle a + de champs)
  const mockAbsents: Absent[] = [
    {
      codeSecret: 'EMP001',
      prenom: 'Ousmane',
      nom: 'Diouf',
      numero: '770000000',
      dateAbsence: '2024-09-01',
      motif: 'Maladie',
      justification: 'Certificat',
      intervention: 'Nettoyage',
      site: 'Agence A'
    },
    {
      codeSecret: 'EMP002',
      prenom: 'Awa',
      nom: 'Ba',
      numero: '780000000',
      dateAbsence: '2024-09-02',
      motif: 'Personnel',
      justification: '',
      intervention: 'Supervision',
      site: 'Agence B'
    }
  ];

  beforeEach(async () => {
    absencesSpy = jasmine.createSpyObj('AbsencesService', ['AbsenceTempsReel']);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['error']);

    absencesSpy.AbsenceTempsReel.and.returnValue(of(mockAbsents));

    await TestBed.configureTestingModule({
      imports: [AbsencesTempsReelComponent],
      providers: [
        { provide: AbsencesService, useValue: absencesSpy },
        { provide: ToastrService, useValue: toastrSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AbsencesTempsReelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit
  });

  /* =========================
     BASIC
  ========================= */

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /* =========================
     INIT / LOAD
  ========================= */

  it('should load absences on init', () => {
    expect(absencesSpy.AbsenceTempsReel).toHaveBeenCalled();
    expect(component.Absences.length).toBe(2);
  });

  it('should initialize Absences$ observable', (done) => {
    component.Absences$.subscribe(data => {
      expect(data.length).toBe(2);
      done();
    });
  });

  /* =========================
     FILTER
  ========================= */

  it('should filter absents by search text (nom)', () => {
    component.searchText = 'diouf';

    const result = component.filteredAbsents;

    expect(result.length).toBe(1);
    expect(result[0].nom).toBe('Diouf');
  });

  it('should filter absents by site', () => {
    component.searchText = 'agence b';

    const result = component.filteredAbsents;

    expect(result.length).toBe(1);
    expect(result[0].site).toBe('Agence B');
  });

  it('should return all absents when searchText is empty', () => {
    component.searchText = '';

    const result = component.filteredAbsents;

    expect(result.length).toBe(2);
  });
});
