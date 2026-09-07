import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteBaremeCongesComponent } from './note-bareme-conges.component';
import { PARAMETRES_CONGES_DEFAUT, ParametresConges } from '../../../../../models/parametres-conges.model';

/**
 * La note explique aux salariés d'où sortent leurs jours : elle doit suivre le barème
 * réellement appliqué, sinon elle devient un mensonge à la première modification RH.
 * C'est toute la raison d'être de ce composant, qui remplace cinq copies de la phrase.
 */
describe('NoteBaremeCongesComponent', () => {

  let fixture: ComponentFixture<NoteBaremeCongesComponent>;
  let composant: NoteBaremeCongesComponent;

  const rendre = (bareme: ParametresConges | null): string => {
    composant.bareme = bareme;
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ').trim();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NoteBaremeCongesComponent] }).compileComponents();
    fixture = TestBed.createComponent(NoteBaremeCongesComponent);
    composant = fixture.componentInstance;
  });

  it('énonce le barème légal par défaut', () => {
    const texte = rendre(PARAMETRES_CONGES_DEFAUT);

    expect(texte).toContain('2 jours ouvrables par mois de service effectif');
    expect(texte).toContain('+ 1 jour par enfant de moins de 14 ans pour les mères de famille');
    expect(texte).toContain("+ 1 à 6 j selon l'ancienneté (à partir de 10 ans)");
  });

  it('retombe sur le barème légal quand aucun barème n’est fourni', () => {
    // L'appel peut être en vol : mieux vaut une note approximative qu'un bloc muet.
    expect(rendre(null)).toContain('2 jours ouvrables par mois');
  });

  it('dit « par parent » quand la réserve aux mères est levée', () => {
    const texte = rendre({ ...PARAMETRES_CONGES_DEFAUT, reserverAuxMeres: false });

    expect(texte).toContain('par parent');
    expect(texte).not.toContain('mères de famille');
  });

  it('suit l’âge limite et le nombre de jours paramétrés', () => {
    const texte = rendre({ ...PARAMETRES_CONGES_DEFAUT, joursParEnfant: 2, ageMaxEnfant: 18 });

    expect(texte).toContain('+ 2 jours par enfant de moins de 18 ans');
  });

  it('annonce le plafond quand il est posé', () => {
    expect(rendre({ ...PARAMETRES_CONGES_DEFAUT, plafondJoursEnfants: 3 }))
      .toContain('dans la limite de 3 j');
  });

  it('tait la mention enfants quand la majoration est désactivée', () => {
    const texte = rendre({ ...PARAMETRES_CONGES_DEFAUT, supplementEnfantsActif: false });

    expect(texte).not.toContain('par enfant');
    expect(texte).toContain("selon l'ancienneté");
  });

  it('tait la mention ancienneté quand la majoration est désactivée', () => {
    const texte = rendre({ ...PARAMETRES_CONGES_DEFAUT, supplementAncienneteActif: false });

    expect(texte).not.toContain('ancienneté');
    expect(texte).toContain('par enfant');
  });

  it('annonce un seul chiffre quand tous les paliers accordent autant', () => {
    const texte = rendre({
      ...PARAMETRES_CONGES_DEFAUT,
      paliersAnciennete: [{ anneesAnciennete: 10, joursSupplementaires: 2 }],
    });

    expect(texte).toContain("+ 2 j selon l'ancienneté (à partir de 10 ans)");
  });

  it('ne tait pas les deux mentions à la fois sans casser la phrase', () => {
    const texte = rendre({
      ...PARAMETRES_CONGES_DEFAUT,
      supplementEnfantsActif: false,
      supplementAncienneteActif: false,
    });

    expect(texte).toContain('2 jours ouvrables par mois de service effectif.');
    expect(texte).toContain('« Antérieur » est le reliquat');
  });
});
