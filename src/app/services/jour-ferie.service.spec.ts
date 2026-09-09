import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { JourFerieService } from './jour-ferie.service';
import { JourFerie } from '../models/jour-ferie.model';
import { environment } from '../../environments/environment';

describe('JourFerieService', () => {
  const url = `${environment.apiUrl}/temps-presences/jours-feries`;

  let service: JourFerieService;
  let http: HttpTestingController;

  const feries: JourFerie[] = [
    { id: '1', date: '2026-01-01', libelle: 'Jour de l’An', chome: true, recurrent: true },
    { id: '2', date: '2026-03-20', libelle: 'Korité', chome: true, recurrent: false },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [JourFerieService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(JourFerieService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ne requête qu’une fois par année', () => {
    const recus: JourFerie[][] = [];
    service.getParAnnee(2026).subscribe(f => recus.push(f));
    service.getParAnnee(2026).subscribe(f => recus.push(f));

    http.expectOne(r => r.url === url && r.params.get('annee') === '2026').flush(feries);

    expect(http.match(r => r.url === url).length).toBe(0);
    expect(recus.length).toBe(2);
  });

  it('cache chaque année séparément', () => {
    service.getParAnnee(2026).subscribe();
    service.getParAnnee(2027).subscribe();

    const requetes = http.match(r => r.url === url);

    expect(requetes.map(r => r.request.params.get('annee'))).toEqual(['2026', '2027']);
    requetes.forEach(r => r.flush([]));
  });

  it('retombe sur une liste vide en cas d’échec — jamais d’écran vidé par un appel annexe', () => {
    let recu: JourFerie[] | undefined;
    service.getParAnnee(2026).subscribe(f => (recu = f));

    http.expectOne(() => true).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(recu).toEqual([]);
  });

  it('charger() laisse l’erreur remonter — l’écran de saisie doit la voir', () => {
    let statut: number | undefined;
    service.charger(2026).subscribe({ error: e => (statut = e.status) });

    http.expectOne(() => true).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(statut).toBe(500);
  });

  it('expose les dates en Set de chaînes ISO, sans passer par Date', () => {
    let dates: Set<string> | undefined;
    service.datesFeriees(2026).subscribe(d => (dates = d));

    http.expectOne(() => true).flush(feries);

    expect(dates!.has('2026-01-01')).toBeTrue();
    expect(dates!.has('2026-03-20')).toBeTrue();
    expect(dates!.size).toBe(2);
  });

  it('absorbe un datetime renvoyé par le backend', () => {
    let dates: Set<string> | undefined;
    service.datesFeriees(2026).subscribe(d => (dates = d));

    http.expectOne(() => true).flush([{ id: '1', date: '2026-01-01T00:00:00', libelle: 'Jour de l’An' }]);

    expect(dates!.has('2026-01-01')).toBeTrue();
  });

  it('invalide le cache après une écriture', () => {
    service.getParAnnee(2026).subscribe();
    http.expectOne(r => r.params.get('annee') === '2026').flush(feries);

    service.creer({ date: '2026-05-01', libelle: 'Fête du Travail' }).subscribe();
    http.expectOne(r => r.method === 'POST').flush({ id: '3', date: '2026-05-01', libelle: 'Fête du Travail' });

    // Sans invalidation, un récapitulatif ouvert derrière l'écran de saisie garderait
    // l'ancien calendrier jusqu'au rechargement de l'application.
    service.getParAnnee(2026).subscribe();

    expect(http.match(r => r.params.get('annee') === '2026').length).toBe(1);
  });
});
