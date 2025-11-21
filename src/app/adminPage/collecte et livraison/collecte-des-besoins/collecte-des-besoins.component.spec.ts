import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollecteDesBesoinsComponent } from './collecte-des-besoins.component';

describe('CollecteDesBesoinsComponent', () => {
  let component: CollecteDesBesoinsComponent;
  let fixture: ComponentFixture<CollecteDesBesoinsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollecteDesBesoinsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollecteDesBesoinsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
