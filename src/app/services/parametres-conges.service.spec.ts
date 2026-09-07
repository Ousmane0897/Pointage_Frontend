import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ParametresCongesService } from './parametres-conges.service';
import { PARAMETRES_CONGES_DEFAUT, ParametresConges } from '../models/parametres-conges.model';
import { environment } from '../../environments/environment';

describe('ParametresCongesService', () => {

  const url = `${environment.apiUrl}/temps-presences/conges/parametres`;

  let service: ParametresCongesService;
  let http: HttpTestingController;

  const bareme: ParametresConges = { ...PARAMETRES_CONGES_DEFAUT, joursParEnfant: 2 };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ParametresCongesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ne fait qu’une seule requête pour deux abonnés', () => {
    // Cinq écrans de solde demandent le barème : une requête par session suffit.
    const recus: ParametresConges[] = [];
    service.getParametres().subscribe(b => recus.push(b));
    service.getParametres().subscribe(b => recus.push(b));

    http.expectOne(url).flush(bareme);

    expect(recus.length).toBe(2);
    expect(recus[0].joursParEnfant).toBe(2);
  });

  it('retombe sur le barème légal quand le GET échoue', () => {
    // Un bloc de solde ne doit pas perdre sa note explicative parce qu'un appel annexe
    // a échoué (backend antérieur, réseau).
    let recu: ParametresConges | undefined;
    service.getParametres().subscribe(b => (recu = b));

    http.expectOne(url).flush('nope', { status: 404, statusText: 'Not Found' });

    expect(recu).toEqual(PARAMETRES_CONGES_DEFAUT);
  });

  it('laisse remonter l’erreur sur charger(), qui n’est pas protégé', () => {
    // L'écran de paramétrage doit voir l'erreur : afficher le barème légal sans le dire
    // laisserait croire que c'est celui en base.
    let statut: number | undefined;
    service.charger().subscribe({ error: err => (statut = err.status) });

    http.expectOne(url).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(statut).toBe(500);
  });

  it('vide le cache après un enregistrement', () => {
    service.getParametres().subscribe();
    http.expectOne(url).flush(bareme);

    service.modifierParametres({ joursParEnfant: 3 }).subscribe();
    const put = http.expectOne(r => r.method === 'PUT' && r.url === url);
    expect(put.request.body).toEqual({ joursParEnfant: 3 });
    put.flush({ ...bareme, joursParEnfant: 3 });

    // Le cache doit être périmé : les notes de pied des écrans de solde doivent
    // refléter le nouveau barème sans recharger l'application.
    let recu: ParametresConges | undefined;
    service.getParametres().subscribe(b => (recu = b));
    http.expectOne(url).flush({ ...bareme, joursParEnfant: 3 });

    expect(recu?.joursParEnfant).toBe(3);
  });

  it('purge le cache sur invalider()', () => {
    service.getParametres().subscribe();
    http.expectOne(url).flush(bareme);

    service.invalider();

    service.getParametres().subscribe();
    http.expectOne(url).flush(bareme);
  });
});
