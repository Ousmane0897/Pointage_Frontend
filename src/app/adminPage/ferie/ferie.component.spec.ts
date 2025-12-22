import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FerieComponent } from './ferie.component';
import { FerieService } from '../../services/ferie.service';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { NgForm } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Ferie } from '../../models/ferie.model';

describe('FerieComponent', () => {
  let component: FerieComponent;
  let fixture: ComponentFixture<FerieComponent>;

  let ferieServiceSpy: jasmine.SpyObj<FerieService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  const mockFeries = [
    { date: '2024-01-01', nom: 'Nouvel An' },
    { date: '2024-04-04', nom: 'Indépendance' }
  ];

  const mockFerie: Ferie = { date: '2024-01-01', nom: 'Nouvel An' };

  beforeEach(async () => {
    ferieServiceSpy = jasmine.createSpyObj('FerieService', [
      'getFeries',
      'postFerie',
      'updateFerie',
      'deleteFerie'
    ]);

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);

    ferieServiceSpy.getFeries.and.returnValue(of(mockFeries));
    ferieServiceSpy.postFerie.and.returnValue(of(mockFerie));
    ferieServiceSpy.updateFerie.and.returnValue(of(mockFerie));
    ferieServiceSpy.deleteFerie.and.returnValue(of(undefined));
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true)
    } as any);

    await TestBed.configureTestingModule({
      imports: [FerieComponent],
      providers: [
        { provide: FerieService, useValue: ferieServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: ToastrService, useValue: toastrSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(FerieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // =====================
  // BASIC
  // =====================

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load feries on init', () => {
    expect(ferieServiceSpy.getFeries).toHaveBeenCalled();
    expect(component.feries.length).toBe(2);
  });

  // =====================
  // MODAL
  // =====================

  it('should open add modal', () => {
    component.openAddModal();

    expect(component.isEditMode).toBeFalse();
    expect(component.showModal).toBeTrue();
    expect(component.selectedId).toBeNull();
  });

  it('should open edit modal', () => {
    component.openEditModal(mockFeries[0]);

    expect(component.isEditMode).toBeTrue();
    expect(component.selectedId).toBe('2024-01-01');
    expect(component.showModal).toBeTrue();
  });

  it('should close modal', () => {
    component.showModal = true;
    component.closeModal();
    expect(component.showModal).toBeFalse();
  });

  // =====================
  // SAVE
  // =====================

  it('should show error if form is invalid', () => {
    const form = {
      invalid: true,
      controls: {
        date: { markAsTouched: jasmine.createSpy() },
        nom: { markAsTouched: jasmine.createSpy() }
      }
    } as any as NgForm;

    component.saveModal(form);

    expect(toastrSpy.error).toHaveBeenCalled();
    expect(ferieServiceSpy.postFerie).not.toHaveBeenCalled();
  });

  it('should create ferie when not in edit mode', () => {
    component.isEditMode = false;

    const form = { invalid: false, controls: {} } as NgForm;

    component.saveModal(form);

    expect(ferieServiceSpy.postFerie).toHaveBeenCalled();
    expect(toastrSpy.success).toHaveBeenCalled();
    expect(component.showModal).toBeFalse();
  });

  it('should update ferie when in edit mode', () => {
    component.isEditMode = true;
    component.selectedId = '2024-01-01';

    const form = { invalid: false, controls: {} } as NgForm;

    component.saveModal(form);

    expect(ferieServiceSpy.updateFerie).toHaveBeenCalledWith(
      '2024-01-01',
      component.modalData
    );
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  // =====================
  // DELETE
  // =====================

  it('should delete ferie after confirmation', () => {
    component.deleteRow('2024-01-01');

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(ferieServiceSpy.deleteFerie).toHaveBeenCalledWith('2024-01-01');
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  it('should show error if delete fails', () => {
    ferieServiceSpy.deleteFerie.and.returnValue(
      throwError(() => new Error('Delete error'))
    );

    component.deleteRow('2024-01-01');

    expect(toastrSpy.error).toHaveBeenCalled();
  });
});
