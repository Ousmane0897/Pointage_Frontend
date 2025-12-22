import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let zone: NgZone;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent] // composant standalone
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    zone = TestBed.inject(NgZone);
    fixture.detectChanges(); // déclenche ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with the first sentence', () => {
    expect(component.currentSentence).toBe(component.sentences[0]);
    expect(component.currentIndex).toBe(0);
  });

  it('should change sentence every 3 seconds', fakeAsync(() => {
    // Phrase initiale
    expect(component.currentSentence).toBe('Cleanic SARL');

    // +3 secondes
    tick(3000);
    expect(component.currentSentence).toBe('Le reflet de votre image de marque');

    // +3 secondes
    tick(3000);
    expect(component.currentSentence).toBe("Plus de 10 ans d'expérience");

    // +3 secondes → retour au début (modulo)
    tick(3000);
    expect(component.currentSentence).toBe('Cleanic SARL');
  }));

  it('should loop through sentences correctly', fakeAsync(() => {
    const totalCycles = component.sentences.length;

    for (let i = 0; i < totalCycles; i++) {
      tick(3000);
    }

    expect(component.currentIndex).toBe(0);
    expect(component.currentSentence).toBe(component.sentences[0]);
  }));
});
