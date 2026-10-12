/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import { PointageQrContexteService } from './pointage-qr-contexte.service';
import { CLE_QR_POINTAGE, TTL_QR_POINTAGE_MS } from '../constants/pointage.constants';

describe('PointageQrContexteService', () => {
  let service: PointageQrContexteService;
  let maintenant: number;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PointageQrContexteService);
    maintenant = 1_000_000;
    service.maintenant = () => maintenant;
  });

  afterEach(() => sessionStorage.clear());

  it('rend le payload mémorisé tant qu\'il est valide', () => {
    service.memoriser('POINTIC:AG:abc');
    maintenant += TTL_QR_POINTAGE_MS;
    expect(service.payloadValide()).toBe('POINTIC:AG:abc');
  });

  it('périme le payload au-delà de 10 minutes et l\'efface', () => {
    service.memoriser('POINTIC:AG:abc');
    maintenant += TTL_QR_POINTAGE_MS + 1;
    expect(service.payloadValide()).toBeNull();
    expect(sessionStorage.getItem(CLE_QR_POINTAGE)).toBeNull();
  });

  it('effacer() supprime le payload (après un pointage réussi)', () => {
    service.memoriser('POINTIC:AG:abc');
    service.effacer();
    expect(service.payloadValide()).toBeNull();
  });

  it('un nouveau scan remplace le précédent et relance le délai', () => {
    service.memoriser('POINTIC:AG:a');
    maintenant += TTL_QR_POINTAGE_MS - 1000;
    service.memoriser('POINTIC:AG:b');
    maintenant += 5 * 60 * 1000;
    expect(service.payloadValide()).toBe('POINTIC:AG:b');
  });

  it('ignore les valeurs vides et les contenus illisibles', () => {
    service.memoriser('   ');
    expect(service.payloadValide()).toBeNull();
    sessionStorage.setItem(CLE_QR_POINTAGE, '{pas du json');
    expect(service.payloadValide()).toBeNull();
  });

  it('un horodatage futur (horloge déréglée) est rejeté', () => {
    service.memoriser('POINTIC:AG:abc');
    maintenant -= 60_000;
    expect(service.payloadValide()).toBeNull();
  });

  it('formeReconnue ne vérifie que le préfixe', () => {
    expect(PointageQrContexteService.formeReconnue('POINTIC:AG:x')).toBeTrue();
    expect(PointageQrContexteService.formeReconnue('https://exemple.com')).toBeFalse();
    expect(PointageQrContexteService.formeReconnue(null)).toBeFalse();
  });
});
