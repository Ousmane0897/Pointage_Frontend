import { TestBed } from '@angular/core/testing';

import { FerieService } from './ferie.service';

describe('FerieService', () => {
  let service: FerieService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FerieService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
