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
import { HttpErrorResponse } from '@angular/common/http';
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
    pointageServiceSpy.getDeviceId.and.returnValue('DEV-1');
    pageCodeServiceSpy = jasmine.createSpyObj('PageCodeService', ['getPointageById']);
    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
    spinnerSpy = jasmine.createSpyObj('NgxSpinnerService', ['show', 'hide']);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['error', 'success']);

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

  describe('refus 429 de la garde anti-triche', () => {
    beforeEach(() => {
      spyOn(component, 'getLocation').and.resolveTo({ lat: 14.7, lng: -17.4 });
      component.form.setValue({ number: '1234' });
    });

    it('affiche le message rédigé par le serveur', async () => {
      const message = 'Ce téléphone vient de servir au pointage d\'un autre agent.';
      pointageServiceSpy.pointer.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 429, error: { error: 'POINTAGE_TROP_FREQUENT', message }
      })));

      await component.pointer();

      expect(toastrSpy.error).toHaveBeenCalledWith(message, 'Pointage refusé', jasmine.any(Object));
      expect(component.isSubmitting).toBeFalse();
    });

    it('retombe sur le texte générique sans message serveur', async () => {
      pointageServiceSpy.pointer.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429 })));

      await component.pointer();

      expect(toastrSpy.error).toHaveBeenCalledWith(
        '⛔ Vous avez déjà pointé récemment.', 'Pointage refusé', jasmine.any(Object));
    });
  });
});
