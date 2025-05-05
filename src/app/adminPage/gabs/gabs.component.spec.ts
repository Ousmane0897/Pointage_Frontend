import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GabsComponent } from './gabs.component';

describe('GabsComponent', () => {
  let component: GabsComponent;
  let fixture: ComponentFixture<GabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GabsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
