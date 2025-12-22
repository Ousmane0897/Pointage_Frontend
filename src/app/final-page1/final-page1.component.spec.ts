import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { FinalPage1Component } from './final-page1.component';
import { PageCodeService } from '../services/page-code.service';
import { Pointage } from '../models/pointage.model';

describe('FinalPage1Component', () => {
  let component: FinalPage1Component;
  let fixture: ComponentFixture<FinalPage1Component>;
  let pageCodeService: jasmine.SpyObj<PageCodeService>;

  const mockPointage: Pointage = {
    codeSecret: 'XYZ789',
    prenom: 'Moussa',
    nom: 'Fall',
    date: '2025-01-11',
    heureArrive: '09:00',
    heureDepart: '18:00',
    duree: '9h',
    status: 'PRESENT',
    site: 'Agence Thiès'
  };

  beforeEach(async () => {
    const pageCodeSpy = jasmine.createSpyObj('PageCodeService', [
      'getPointageById'
    ]);

    await TestBed.configureTestingModule({
      // ✅ IMPORTANT : imports (standalone)
      imports: [FinalPage1Component],
      providers: [
        { provide: PageCodeService, useValue: pageCodeSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) =>
                  key === 'codeSecret' ? 'XYZ789' : null
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FinalPage1Component);
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
      .toHaveBeenCalledWith('XYZ789');

    expect(component.pointage).toEqual(mockPointage);
  });
});
