import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockageComponent } from './stockage.component';

describe('StockageComponent', () => {
  let component: StockageComponent;
  let fixture: ComponentFixture<StockageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StockageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
