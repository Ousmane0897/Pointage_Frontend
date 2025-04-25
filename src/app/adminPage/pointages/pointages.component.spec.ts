import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PointagesComponent } from './pointages.component';

describe('PointagesComponent', () => {
  let component: PointagesComponent;
  let fixture: ComponentFixture<PointagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PointagesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PointagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
