import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PointageHistoriqueComponent } from './pointage-historique.component';

describe('PointageHistoriqueComponent', () => {
  let component: PointageHistoriqueComponent;
  let fixture: ComponentFixture<PointageHistoriqueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PointageHistoriqueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PointageHistoriqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
