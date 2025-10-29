import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RapportsEtStatistiquesComponent } from './rapports-et-statistiques.component';

describe('RapportsEtStatistiquesComponent', () => {
  let component: RapportsEtStatistiquesComponent;
  let fixture: ComponentFixture<RapportsEtStatistiquesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RapportsEtStatistiquesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RapportsEtStatistiquesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
