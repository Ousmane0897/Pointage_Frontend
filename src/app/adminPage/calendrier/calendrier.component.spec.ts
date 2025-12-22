import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CalendrierComponent } from './calendrier.component';
import { EmployeService } from '../../services/employe.service';
import { AgencesService } from '../../services/agences.service';
import { PlanificationService } from '../../services/planification.service';
import { ToastrService } from 'ngx-toastr';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Employe } from '../../models/employe.model';
import { Planification } from '../../models/planification.model';

/* ============================
   🔧 MOCK EMPLOYE (STRICT)
============================ */
const mockEmploye: Employe = {
  codeSecret: 'EMP001',
  nom: 'Diouf',
  prenom: 'Ousmane',
  numero: '770000000',
  intervention: 'Nettoyage',
  statut: 'ACTIF',
  employeCreePar: 'Admin',
  site: ['Site A'],
  joursDeTravail: 'Lundi-Vendredi',
  deplacement: false,
  remplacement: false,
  heureDebut: '08:00',
  heureFin: '16:00',
  dateEtHeureCreation: '2024-01-01T08:00:00'
};

const mockEmployes: Employe[] = [mockEmploye];

// ============================
// 🔧 MOCK EMPLOYE (DOUBLE PLAGE)
// ============================
const mockEmployeDoublePlage: Employe = {
  codeSecret: 'EMP002',
  nom: 'Fall',
  prenom: 'Moussa',
  numero: '780000000',
  intervention: 'Nettoyage',
  statut: 'ACTIF',
  employeCreePar: 'Admin',
  site: ['Site A', 'Site B'],
  joursDeTravail: 'Lundi-Vendredi',
  joursDeTravail2: 'Lundi-Vendredi',
  deplacement: false,
  remplacement: false,
  heureDebut: '08:00',
  heureFin: '12:00',
  heureDebut2: '14:00',
  heureFin2: '18:00',
  dateEtHeureCreation: '2024-01-01T08:00:00'
};

// ============================
// 🔧 MOCK EMPLOYE (DÉPLACÉ)
// ============================
const mockEmployeDeplace: Employe = {
  codeSecret: 'EMP003',
  nom: 'Ba',
  prenom: 'Awa',
  numero: '760000000',
  intervention: 'Nettoyage',
  statut: 'ACTIF',
  employeCreePar: 'Admin',
  site: ['Site C'],
  joursDeTravail: 'Lundi-Vendredi',
  deplacement: true,
  remplacement: false,
  heureDebut: '06:00',
  heureFin: '14:00',
  dateEtHeureCreation: '2024-01-01T08:00:00'
};

// ============================
// 🔧 MOCK PLANIFICATION
// ============================
const mockPlanification: Planification = {
  id: 'PLAN001',
  prenomNom: 'Ousmane Diouf',
  codeSecret: 'EMP001',
  nomSite: 'Site A',
  siteDestination: ['Site B'],
  personneRemplacee: '',
  dateDebut: new Date(),
  dateFin: new Date(),
  heureDebut: '08:00',
  heureFin: '16:00',
  statut: 'EN_ATTENTE',
  commentaires: null,
  motifAnnulation: null,
  dateCreation: new Date()
};




describe('CalendrierComponent', () => {
  let component: CalendrierComponent;
  let fixture: ComponentFixture<CalendrierComponent>;

  let employeSpy: jasmine.SpyObj<EmployeService>;
  let agenceSpy: jasmine.SpyObj<AgencesService>;
  let planificationSpy: jasmine.SpyObj<PlanificationService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  beforeEach(async () => {
    employeSpy = jasmine.createSpyObj('EmployeService', [
      'getEmployes',
      'getEmployeEnDeplacement',
      'getEmployeesDansUnSite'
    ]);

    agenceSpy = jasmine.createSpyObj('AgencesService', ['getAllSites']);

    planificationSpy = jasmine.createSpyObj('PlanificationService', [
      'addPlanification',
      'updatePlanification',
      'getPlanificationByCodeEmploye'
    ]);

    toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);

    employeSpy.getEmployes.and.returnValue(of(mockEmployes));
    employeSpy.getEmployeEnDeplacement.and.returnValue(of([mockEmployeDeplace]));
    employeSpy.getEmployeesDansUnSite.and.returnValue(of([mockEmploye]));

    agenceSpy.getAllSites.and.returnValue(of(['Site A', 'Site B']));

    planificationSpy.addPlanification.and.returnValue(of(mockPlanification));
    planificationSpy.updatePlanification.and.returnValue(of(mockPlanification));

    await TestBed.configureTestingModule({
      imports: [
        CalendrierComponent,
        HttpClientTestingModule
      ],
      providers: [
        { provide: EmployeService, useValue: employeSpy },
        { provide: AgencesService, useValue: agenceSpy },
        { provide: PlanificationService, useValue: planificationSpy },
        { provide: ToastrService, useValue: toastrSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CalendrierComponent);
    component = fixture.componentInstance;

    // Mock ViewChild MatMenuTrigger
    component.menuTrigger = {
      openMenu: jasmine.createSpy('openMenu')
    } as any;

    fixture.detectChanges(); // ngOnInit
  });

  /* ============================
     BASIC
  ============================ */

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load employees and generate events on init', () => {
    expect(employeSpy.getEmployes).toHaveBeenCalled();
    expect(component.events.length).toBeGreaterThan(0);
  });

  it('should load available sites', () => {
    expect(agenceSpy.getAllSites).toHaveBeenCalled();
    expect(component.availableSites.length).toBe(2);
  });

  /* ============================
     EVENTS
  ============================ */

  it('should generate yearly events correctly', () => {
    const events = component.generateYearlyEvents([mockEmploye]);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].extendedProps?.['codeEmploye']).toBe('EMP001');
    expect(events[0].extendedProps?.['site']).toBe('Site A');
  });

  it('should filter events by site', () => {
    component.selectedSite = 'Site A';
    component.applyFilter();

    expect(component.calendarOptions.events.length).toBeGreaterThan(0);
  });

  /* ============================
     EVENT CLICK
  ============================ */

  it('should open context menu on event click', () => {
    const clickInfo = {
      event: {
        title: 'Ousmane Diouf',
        extendedProps: {
          codeEmploye: 'EMP001',
          intervention: 'Nettoyage',
          statut: 'ACTIF',
          site: 'Site A',
          deplacement: false
        },
        start: new Date(),
        end: new Date()
      },
      jsEvent: { clientX: 120, clientY: 240 }
    };

    component.handleEventClick(clickInfo);

    expect(component.menuTrigger.openMenu).toHaveBeenCalled();
    expect(component.selectedEmploye.codeEmploye).toBe('EMP001');
  });

  // ============================
  // DOUBLE TIME SLOT
  // ============================
  it('should generate TWO events per day when employe has double time slot', () => {
    const events = component.generateYearlyEvents([mockEmployeDoublePlage]);

    // on récupère les événements du premier jour
    const firstDayEvents = events.filter(e =>
      e.id?.toString().startsWith('EMP002-1-1')
    );

    expect(firstDayEvents.length).toBe(2);

    expect(firstDayEvents[0].extendedProps?.['site']).toBe('Site A');
    expect(firstDayEvents[1].extendedProps?.['site']).toBe('Site B');
  });

  // ============================
  // DÉPLACEMENT
  // ============================
  it('should mark employee as mobile and color event RED when employe is in deplacement', () => {
    const events = component.generateYearlyEvents([mockEmployeDeplace]);

    // isMobile doit être activé
    expect(component.isMobile).toBeTrue();

    // au moins un event rouge
    const redEvent = events.find(e => e.color === '#D10000');
    expect(redEvent).toBeTruthy();
  });



  /* ============================
     SAVE MODAL
  ============================ */

  it('should show error if form is invalid', () => {
    const form = { invalid: true, controls: {} } as NgForm;

    component.saveModal(form);

    expect(toastrSpy.error).toHaveBeenCalled();
  });

  it('should add planification when form is valid (typed Planification)', fakeAsync(() => {
    component.modalData = { ...mockPlanification };

    const form = {
      invalid: false,
      controls: {}
    } as NgForm;

    component.saveModal(form);
    tick();

    expect(planificationSpy.addPlanification).toHaveBeenCalled();
    expect(toastrSpy.success).toHaveBeenCalled();
  }));


  /* ============================
     EVENT CHANGE
  ============================ */

  it('should update event on change', () => {
    const event = {
      id: component.events[0].id,
      start: new Date(),
      end: new Date()
    };

    component.handleEventChange({ event });

    expect(component.calendarOptions.events.length).toBeGreaterThan(0);
  });
});
