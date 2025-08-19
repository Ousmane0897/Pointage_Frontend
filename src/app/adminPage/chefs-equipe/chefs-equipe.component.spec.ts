import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChefsEquipeComponent } from './chefs-equipe.component';

describe('ChefsEquipeComponent', () => {
  let component: ChefsEquipeComponent;
  let fixture: ComponentFixture<ChefsEquipeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChefsEquipeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChefsEquipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
