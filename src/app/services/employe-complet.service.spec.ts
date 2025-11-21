import { TestBed } from '@angular/core/testing';

import { EmployeCompletService } from './employe-complet.service';

describe('EmployeCompletService', () => {
  let service: EmployeCompletService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmployeCompletService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
