import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuiviCommandesComponent } from './suivi-commandes.component';

describe('SuiviCommandesComponent', () => {
  let component: SuiviCommandesComponent;
  let fixture: ComponentFixture<SuiviCommandesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuiviCommandesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuiviCommandesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
