import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperAdminLoginPageComponent } from './super-admin-login-page.component';

describe('SuperAdminLoginPageComponent', () => {
  let component: SuperAdminLoginPageComponent;
  let fixture: ComponentFixture<SuperAdminLoginPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperAdminLoginPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SuperAdminLoginPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
