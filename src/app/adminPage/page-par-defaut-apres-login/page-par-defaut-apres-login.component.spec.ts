import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageParDefautApresLoginComponent } from './page-par-defaut-apres-login.component';

describe('PageParDefautApresLoginComponent', () => {
  let component: PageParDefautApresLoginComponent;
  let fixture: ComponentFixture<PageParDefautApresLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageParDefautApresLoginComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageParDefautApresLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
