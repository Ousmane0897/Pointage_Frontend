import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalPage2Component } from './final-page2.component';

describe('FinalPage2Component', () => {
  let component: FinalPage2Component;
  let fixture: ComponentFixture<FinalPage2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinalPage2Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FinalPage2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
