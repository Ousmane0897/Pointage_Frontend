import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RapportMensuelComponent } from './rapport-mensuel.component';

describe('RapportMensuelComponent', () => {
  let component: RapportMensuelComponent;
  let fixture: ComponentFixture<RapportMensuelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RapportMensuelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RapportMensuelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
