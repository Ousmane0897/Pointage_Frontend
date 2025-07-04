import { TestBed } from '@angular/core/testing';

import { PageCodeService } from './page-code.service';

describe('PageCodeService', () => {
  let service: PageCodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PageCodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
