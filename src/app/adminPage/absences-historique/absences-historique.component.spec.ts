import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbsencesHistoriqueComponent } from './absences-historique.component';
import { AbsencesService } from '../../services/absences.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { Absent } from '../../models/absent.model';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

// 🔹 Mock autoTable
(jasmine as any).getGlobal().autoTable = jasmine.createSpy('autoTable');

describe('AbsencesHistoriqueComponent', () => {
  let component: AbsencesHistoriqueComponent;
  let fixture: ComponentFixture<AbsencesHistoriqueComponent>;

  let absencesSpy: jasmine.SpyObj<AbsencesService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

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

  const mockAbsent: Absent = mockAbsents[0];

  beforeEach(async () => {
    absencesSpy = jasmine.createSpyObj('AbsencesService', [
      'AbsenceHistorique',
      'updateAbsent'
    ]);

    toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);

    absencesSpy.AbsenceHistorique.and.returnValue(of(mockAbsents)); 
    absencesSpy.updateAbsent.and.returnValue(of(mockAbsent)); 

    await TestBed.configureTestingModule({
      imports: [AbsencesHistoriqueComponent],
      providers: [
        { provide: AbsencesService, useValue: absencesSpy },
        { provide: ToastrService, useValue: toastrSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AbsencesHistoriqueComponent);
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
     LOAD DATA
  ========================= */

  it('should load absences on init', () => {
    expect(absencesSpy.AbsenceHistorique).toHaveBeenCalled();
    expect(component.Absences.length).toBe(2);
  });

  it('should initialize Absences$ observable', (done) => {
    component.Absences$.subscribe(data => {
      expect(data.length).toBe(2);
      done();
    });
  });

  /* =========================
     MODAL
  ========================= */

  it('should open edit modal', () => {
    component.openEditModal(mockAbsents[0]);

    expect(component.showModal).toBeTrue();
    expect(component.selectedId).toBe('EMP001');
  });

  it('should close modal', () => {
    component.showModal = true;
    component.closeModal();

    expect(component.showModal).toBeFalse();
  });

  /* =========================
     SAVE MODAL
  ========================= */

  it('should not save if form is invalid', () => {
    const fakeForm = {
      invalid: true,
      controls: {}
    } as any;

    component.saveModal(fakeForm);

    expect(toastrSpy.error).toHaveBeenCalled();
    expect(absencesSpy.updateAbsent).not.toHaveBeenCalled();
  });

  it('should update absent if form is valid', () => {
    component.selectedId = 'EMP001';
    component.modalData = mockAbsents[0];

    const fakeForm = {
      invalid: false,
      controls: {}
    } as any;

    component.saveModal(fakeForm);

    expect(absencesSpy.updateAbsent).toHaveBeenCalledWith(
      'EMP001',
      component.modalData
    );
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  /* =========================
     FILTER
  ========================= */

  it('should filter absents by name', () => {
    component.searchText = 'diouf';

    const result = component.filteredAbsents;

    expect(result.length).toBe(1);
    expect(result[0].nom).toBe('Diouf');
  });

  /* =========================
     EXPORT EXCEL
  ========================= */

  it('should export absents to Excel', () => {
    spyOn(XLSX.utils, 'json_to_sheet').and.callThrough();
    spyOn(XLSX.utils, 'book_new').and.callThrough();
    spyOn(XLSX.utils, 'book_append_sheet').and.callThrough();
    spyOn(XLSX, 'writeFile');

    component.exportExcel();

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      jasmine.any(Object),
      'Absents.xlsx'
    );
  });

  /* =========================
     EXPORT PDF
  ========================= */

  it('should export absents to PDF', () => {
    const saveSpy = spyOn(jsPDF.prototype, 'save');

    component.exportPdf();

    expect(saveSpy).toHaveBeenCalledWith('Absents.pdf', jasmine.anything());
  });
});
