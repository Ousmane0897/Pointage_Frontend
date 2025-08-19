import { TestBed } from '@angular/core/testing';

import { StockageService } from './stockage.service';

describe('StockageService', () => {
  let service: StockageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
