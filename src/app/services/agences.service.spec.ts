import { TestBed } from '@angular/core/testing';

import { AgencesService } from './agences.service';

describe('AgencesService', () => {
  let service: AgencesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgencesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
