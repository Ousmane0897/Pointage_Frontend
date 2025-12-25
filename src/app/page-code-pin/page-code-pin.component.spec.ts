import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageCodePinComponent } from './page-code-pin.component';
import { PointageService } from '../services/pointage.service';
import { PageCodeService } from '../services/page-code.service';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
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
    pointageServiceSpy = jasmine.createSpyObj('PointageService', ['pointer']);
    pageCodeServiceSpy = jasmine.createSpyObj('PageCodeService', ['getPointageById']);
    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
    spinnerSpy = jasmine.createSpyObj('NgxSpinnerService', ['show', 'hide']);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['error', 'success']);

    const pointage: Pointage = {
      codeSecret: '1234',
      prenom: 'John',
      nom: 'Doe',
      date: '2024-10-01',
      heureArrive: '08:00',
      heureDepart: '17:00',
      duree: '9h',
      status: 'En cours',
      site: 'Agence A'
      
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
});
