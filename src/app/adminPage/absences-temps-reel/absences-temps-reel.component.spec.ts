import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbsencesTempsReelComponent } from './absences-temps-reel.component';

describe('AbsencesTempsReelComponent', () => {
  let component: AbsencesTempsReelComponent;
  let fixture: ComponentFixture<AbsencesTempsReelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbsencesTempsReelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AbsencesTempsReelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
