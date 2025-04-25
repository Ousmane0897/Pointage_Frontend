import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageCodePinComponent } from './page-code-pin.component';

describe('PageCodePinComponent', () => {
  let component: PageCodePinComponent;
  let fixture: ComponentFixture<PageCodePinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageCodePinComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PageCodePinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
