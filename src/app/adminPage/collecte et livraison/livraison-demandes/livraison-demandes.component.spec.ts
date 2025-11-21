import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LivraisonDemandesComponent } from './livraison-demandes.component';

describe('LivraisonDemandesComponent', () => {
  let component: LivraisonDemandesComponent;
  let fixture: ComponentFixture<LivraisonDemandesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LivraisonDemandesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LivraisonDemandesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
