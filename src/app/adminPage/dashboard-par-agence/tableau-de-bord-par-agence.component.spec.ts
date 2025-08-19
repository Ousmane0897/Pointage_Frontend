import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableauDeBordParAgenceComponent } from './tableau-de-bord-par-agence.component';

describe('TableauDeBordParAgenceComponent', () => {
  let component: TableauDeBordParAgenceComponent;
  let fixture: ComponentFixture<TableauDeBordParAgenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableauDeBordParAgenceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TableauDeBordParAgenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
