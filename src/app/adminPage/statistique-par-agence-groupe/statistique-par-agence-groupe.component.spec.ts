import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatistiqueParAgenceGroupeComponent } from './statistique-par-agence-groupe.component';

describe('StatistiqueParAgenceGroupeComponent', () => {
  let component: StatistiqueParAgenceGroupeComponent;
  let fixture: ComponentFixture<StatistiqueParAgenceGroupeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatistiqueParAgenceGroupeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatistiqueParAgenceGroupeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
