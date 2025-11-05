import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriquesEntreesComponent } from './historiques-entrees.component';

describe('HistoriquesEntreesComponent', () => {
  let component: HistoriquesEntreesComponent;
  let fixture: ComponentFixture<HistoriquesEntreesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriquesEntreesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoriquesEntreesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
