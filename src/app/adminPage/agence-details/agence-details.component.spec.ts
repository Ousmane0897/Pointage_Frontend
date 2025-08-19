import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgenceDetailsComponent } from './agence-details.component';

describe('AgenceDetailsComponent', () => {
  let component: AgenceDetailsComponent;
  let fixture: ComponentFixture<AgenceDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgenceDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AgenceDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
