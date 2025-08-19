import { TestBed } from '@angular/core/testing';

import { DashboardParAgenceService } from './dashboard-par-agence.service';

describe('DashboardParAgenceService', () => {
  let service: DashboardParAgenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardParAgenceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
