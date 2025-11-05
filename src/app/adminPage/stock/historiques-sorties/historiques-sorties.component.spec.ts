import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriquesSortiesComponent } from './historiques-sorties.component';

describe('HistoriquesSortiesComponent', () => {
  let component: HistoriquesSortiesComponent;
  let fixture: ComponentFixture<HistoriquesSortiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriquesSortiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoriquesSortiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
