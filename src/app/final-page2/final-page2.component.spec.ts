import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { FinalPage2Component } from './final-page2.component';
import { PageCodeService } from '../services/page-code.service';
import { Pointage } from '../models/pointage.model';

describe('FinalPage2Component', () => {
  let component: FinalPage2Component;
  let fixture: ComponentFixture<FinalPage2Component>;
  let pageCodeService: jasmine.SpyObj<PageCodeService>;

  const mockPointage: Pointage = {
    codeSecret: 'ABC123',
    prenom: 'Ali',
    nom: 'Diop',
    date: '2025-01-10',
    heureArrive: '08:30',
    heureDepart: '17:00',
    duree: '8h30',
    status: 'PRESENT',
    site: 'Agence Dakar'
  };

  beforeEach(async () => {
    const pageCodeSpy = jasmine.createSpyObj('PageCodeService', [
      'getPointageById'
    ]);

    await TestBed.configureTestingModule({
      // ✅ IMPORTANT : imports et NON declarations
      imports: [FinalPage2Component],
      providers: [
        { provide: PageCodeService, useValue: pageCodeSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) =>
                  key === 'codeSecret' ? 'ABC123' : null
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FinalPage2Component);
    component = fixture.componentInstance;

    pageCodeService = TestBed.inject(
      PageCodeService
    ) as jasmine.SpyObj<PageCodeService>;

    pageCodeService.getPointageById.and.returnValue(of(mockPointage));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load pointage using codeSecret from route', () => {
    component.ngOnInit();

    expect(pageCodeService.getPointageById)
      .toHaveBeenCalledWith('ABC123');

    expect(component.pointage).toEqual(mockPointage);
  });
});
