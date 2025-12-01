import { TestBed } from '@angular/core/testing';

import { SuperviseursService } from './superviseurs.service';

describe('SuperviseursService', () => {
  let service: SuperviseursService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SuperviseursService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
