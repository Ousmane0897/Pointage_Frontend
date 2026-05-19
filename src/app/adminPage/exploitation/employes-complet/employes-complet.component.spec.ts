import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployesCompletComponent } from './employes-complet.component';

describe('EmployesCompletComponent', () => {
  let component: EmployesCompletComponent;
  let fixture: ComponentFixture<EmployesCompletComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployesCompletComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployesCompletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
