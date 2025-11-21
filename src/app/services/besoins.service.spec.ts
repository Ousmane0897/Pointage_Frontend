import { TestBed } from '@angular/core/testing';

import { BesoinsService } from './besoins.service';

describe('BesoinsService', () => {
  let service: BesoinsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BesoinsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
