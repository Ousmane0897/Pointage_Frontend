import { TestBed } from '@angular/core/testing';

import { StockV2BonPermissionsService } from './stock-v2-bon-permissions.service';
import { LoginService } from './login.service';
import { BonSortie } from '../models/stock-v2-bon-sortie.model';
import { StatutBon } from '../models/stock-v2-workflow.model';

describe('StockV2BonPermissionsService', () => {
  let service: StockV2BonPermissionsService;
  let login: jasmine.SpyObj<LoginService>;

  const bon = (creeParEmail: string | undefined, statut: StatutBon = 'BROUILLON'): BonSortie => ({
    id: 'b1',
    type: 'CONSOMMATION_INTERNE',
    date: '2026-07-29',
    siteSourceId: 's1',
    destinataire: { type: 'SITE', siteId: 's2' },
    lignes: [],
    statut,
    creeParEmail,
  });

  const connecte = (role: string, email: string | null) => {
    login.getUserRole.and.returnValue(role);
    login.getUserEmail.and.returnValue(email);
  };

  beforeEach(() => {
    login = jasmine.createSpyObj<LoginService>('LoginService', ['getUserRole', 'getUserEmail']);
    TestBed.configureTestingModule({
      providers: [{ provide: LoginService, useValue: login }],
    });
    service = TestBed.inject(StockV2BonPermissionsService);
  });

  describe('SUPERADMIN', () => {
    beforeEach(() => connecte('SUPERADMIN', 'boss@cleanic.sn'));

    it('peut soumettre et valider', () => {
      expect(service.peutSoumettre()).toBeTrue();
      expect(service.peutValider()).toBeTrue();
    });

    it('peut consulter, modifier et supprimer le bon d’un autre', () => {
      const b = bon('agent@cleanic.sn');
      expect(service.peutConsulter(b)).toBeTrue();
      expect(service.peutModifier(b)).toBeTrue();
      expect(service.peutSupprimer(b)).toBeTrue();
    });
  });

  describe('CONTROLEUR_STOCK', () => {
    beforeEach(() => connecte('CONTROLEUR_STOCK', 'ctrl@cleanic.sn'));

    it('peut soumettre mais pas valider', () => {
      expect(service.peutSoumettre()).toBeTrue();
      expect(service.peutValider()).toBeFalse();
    });

    it('peut consulter et modifier le bon d’un autre', () => {
      const b = bon('agent@cleanic.sn');
      expect(service.peutConsulter(b)).toBeTrue();
      expect(service.peutModifier(b)).toBeTrue();
    });
  });

  describe('profil lambda', () => {
    beforeEach(() => connecte('MAGASINIER', 'agent@cleanic.sn'));

    it('ne peut ni soumettre ni valider', () => {
      expect(service.peutSoumettre()).toBeFalse();
      expect(service.peutValider()).toBeFalse();
    });

    it('peut consulter, modifier et supprimer son propre brouillon', () => {
      const b = bon('agent@cleanic.sn');
      expect(service.estProprietaire(b)).toBeTrue();
      expect(service.peutConsulter(b)).toBeTrue();
      expect(service.peutModifier(b)).toBeTrue();
      expect(service.peutSupprimer(b)).toBeTrue();
    });

    it('propriété insensible à la casse et aux espaces', () => {
      expect(service.estProprietaire(bon('  Agent@Cleanic.SN '))).toBeTrue();
    });

    it('ne peut rien faire sur le bon d’un autre', () => {
      const b = bon('autre@cleanic.sn');
      expect(service.estProprietaire(b)).toBeFalse();
      expect(service.peutConsulter(b)).toBeFalse();
      expect(service.peutModifier(b)).toBeFalse();
      expect(service.peutSupprimer(b)).toBeFalse();
    });

    it('ne peut pas soumettre son propre brouillon (rôle non habilité)', () => {
      expect(service.peutSoumettreBon(bon('agent@cleanic.sn'))).toBeFalse();
    });

    it('ne peut pas modifier un bon déjà soumis', () => {
      expect(service.peutModifier(bon('agent@cleanic.sn', 'SOUMIS'))).toBeFalse();
    });
  });

  describe('repli transitoire — creeParEmail absent', () => {
    it('propriété acquise pour ne pas verrouiller avant livraison backend', () => {
      connecte('MAGASINIER', 'agent@cleanic.sn');
      const b = bon(undefined);
      expect(service.estProprietaire(b)).toBeTrue();
      expect(service.peutModifier(b)).toBeTrue();
    });

    it('mais les restrictions par rôle restent actives', () => {
      connecte('MAGASINIER', 'agent@cleanic.sn');
      expect(service.peutSoumettreBon(bon(undefined))).toBeFalse();
      expect(service.peutValider()).toBeFalse();
    });
  });
});
