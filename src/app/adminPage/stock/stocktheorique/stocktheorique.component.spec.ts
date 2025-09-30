import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StocktheoriqueComponent } from './stocktheorique.component';

describe('StocktheoriqueComponent', () => {
  let component: StocktheoriqueComponent;
  let fixture: ComponentFixture<StocktheoriqueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StocktheoriqueComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StocktheoriqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
