/// <reference types="jasmine" />
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageCodePinComponent } from './page-code-pin.component';
import { PointageService } from '../services/pointage.service';
import { PageCodeService } from '../services/page-code.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of, throwError } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import { PointageQrContexteService } from '../services/pointage-qr-contexte.service';
import { Pointage } from '../models/pointage.model';

describe('PageCodePinComponent', () => {
  let component: PageCodePinComponent;
  let fixture: ComponentFixture<PageCodePinComponent>;

  let pointageServiceSpy: jasmine.SpyObj<PointageService>;
  let pageCodeServiceSpy: jasmine.SpyObj<PageCodeService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let spinnerSpy: jasmine.SpyObj<NgxSpinnerService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  beforeEach(async () => {
    pointageServiceSpy = jasmine.createSpyObj('PointageService', ['pointer', 'getDeviceId']);
    pageCodeServiceSpy = jasmine.createSpyObj('PageCodeService', ['getPointageById']);
    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
    spinnerSpy = jasmine.createSpyObj('NgxSpinnerService', ['show', 'hide']);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['error', 'success', 'warning']);

    const pointage: Pointage = {
      id: '1',
      codeSecret: '1234',
      prenom: 'John',
      nom: 'Doe',
      date: '2024-10-01',
      heureArrive: '08:00',
      heureDepart: '17:00',
      adresse: '123 Main St',
      duree: '9h',
      status: 'En cours',
      site: ['Agence A']
    };

    pageCodeServiceSpy.getPointageById.and.returnValue(of(pointage));

    await TestBed.configureTestingModule({
      imports: [
        PageCodePinComponent, // ✅ composant standalone
        ReactiveFormsModule,
        CommonModule
      ],
      providers: [
        { provide: PointageService, useValue: pointageServiceSpy },
        { provide: PageCodeService, useValue: pageCodeServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: NgxSpinnerService, useValue: spinnerSpy },
        { provide: ToastrService, useValue: toastrSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PageCodePinComponent);
    component = fixture.componentInstance;

    pageCodeServiceSpy.getPointageById.and.returnValue(of(pointage));

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ===============================
  // 🔹 QR CODE D'AGENCE
  // ===============================

  describe("QR code d'agence", () => {
    let qrContexte: PointageQrContexteService;

    beforeEach(() => {
      sessionStorage.clear();
      qrContexte = TestBed.inject(PointageQrContexteService);
      spyOn(component, 'getLocation').and.returnValue(Promise.resolve({ lat: 14.7, lng: -17.4, precision: 12 }));
      pointageServiceSpy.getDeviceId.and.returnValue('DEV-1');
      component.form.setValue({ number: '1234' });
    });

    afterEach(() => sessionStorage.clear());

    it("joint le QR mémorisé, l'efface après succès et annonce l'agence", fakeAsync(() => {
      qrContexte.memoriser('POINTIC:AG:abc');
      pointageServiceSpy.pointer.and.returnValue(of({
        codeSecret: '1234', heureArrive: '08:05', heureDepart: null, type: 'ENTREE',
        agenceNom: 'SGS Mermoz', avertissement: null,
      } as any));

      component.pointer();
      tick();

      expect(pointageServiceSpy.pointer).toHaveBeenCalledWith(jasmine.objectContaining({
        qrPayload: 'POINTIC:AG:abc', precisionMetres: 12,
      }));
      expect(qrContexte.payloadValide()).toBeNull();
      expect(toastrSpy.success).toHaveBeenCalledWith('Entrée enregistrée à 08:05 — SGS Mermoz', jasmine.any(String));
      expect(toastrSpy.warning).not.toHaveBeenCalled();

      tick(4000);
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/pagefinal1/1234',
        jasmine.objectContaining({ state: jasmine.objectContaining({ confirmation: jasmine.objectContaining({ agenceNom: 'SGS Mermoz' }) }) }));
    }));

    it("une sortie hors affectation affiche l'avertissement", fakeAsync(() => {
      pointageServiceSpy.pointer.and.returnValue(of({
        codeSecret: '1234', heureArrive: '08:05', heureDepart: '17:00', type: 'SORTIE',
        agenceNom: 'BGFI Tann', avertissement: 'BGFI Tann ne fait pas partie de vos affectations',
      } as any));

      component.pointer();
      tick(4000);

      expect(toastrSpy.success).toHaveBeenCalledWith('Sortie enregistrée à 17:00 — BGFI Tann', jasmine.any(String));
      expect(toastrSpy.warning).toHaveBeenCalled();
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/pagefinal2/1234', jasmine.any(Object));
    }));

    it('un refus 422 affiche le message serveur et conserve le QR pour un nouvel essai', fakeAsync(() => {
      qrContexte.memoriser('POINTIC:AG:abc');
      pointageServiceSpy.pointer.and.returnValue(throwError(() => ({
        status: 422, error: { message: 'Vous êtes hors de la zone de SGS Mermoz (240 m, tolérance 100 m).' },
      })));

      component.pointer();
      tick();

      expect(toastrSpy.error).toHaveBeenCalledWith(
        'Vous êtes hors de la zone de SGS Mermoz (240 m, tolérance 100 m).', 'Pointage refusé', jasmine.any(Object));
      expect(qrContexte.payloadValide()).toBe('POINTIC:AG:abc');
      expect(component.isSubmitting).toBeFalse();
    }));

    it('sans QR mémorisé, le pointage part sans payload', fakeAsync(() => {
      pointageServiceSpy.pointer.and.returnValue(of({ codeSecret: '1234', heureArrive: '08:05' } as any));

      component.pointer();
      tick(4000);

      expect(pointageServiceSpy.pointer).toHaveBeenCalledWith(jasmine.objectContaining({ qrPayload: null }));
      expect(toastrSpy.success).toHaveBeenCalledWith('Entrée enregistrée à 08:05', jasmine.any(String));
    }));
  });
});
