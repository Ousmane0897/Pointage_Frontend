import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuiviStockComponent } from './suivi-stock.component';

describe('SuiviStockComponent', () => {
  let component: SuiviStockComponent;
  let fixture: ComponentFixture<SuiviStockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuiviStockComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SuiviStockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
