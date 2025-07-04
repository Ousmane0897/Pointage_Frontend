import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FerieComponent } from './ferie.component';

describe('FerieComponent', () => {
  let component: FerieComponent;
  let fixture: ComponentFixture<FerieComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FerieComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FerieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
