import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbsencesHistoriqueComponent } from './absences-historique.component';

describe('AbsencesHistoriqueComponent', () => {
  let component: AbsencesHistoriqueComponent;
  let fixture: ComponentFixture<AbsencesHistoriqueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbsencesHistoriqueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AbsencesHistoriqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
