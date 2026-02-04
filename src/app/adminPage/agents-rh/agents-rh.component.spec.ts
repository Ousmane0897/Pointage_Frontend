import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentsRhComponent } from './agents-rh.component';

describe('AgentsRhComponent', () => {
  let component: AgentsRhComponent;
  let fixture: ComponentFixture<AgentsRhComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentsRhComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgentsRhComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
