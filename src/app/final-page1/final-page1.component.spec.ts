import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalPage1Component } from './final-page1.component';

describe('FinalPage1Component', () => {
  let component: FinalPage1Component;
  let fixture: ComponentFixture<FinalPage1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinalPage1Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FinalPage1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
