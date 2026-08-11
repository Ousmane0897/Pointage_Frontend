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

    it('peut supprimer définitivement un bon déjà engagé, quel que soit son statut', () => {
      (['SOUMIS', 'VALIDE', 'EFFECTIF', 'REFUSE'] as StatutBon[]).forEach(statut =>
        expect(service.peutSupprimerDefinitivement(bon('agent@cleanic.sn', statut))).toBeTrue());
    });

    it('ne propose pas la suppression définitive sur un brouillon (peutSupprimer s’en charge)', () => {
      expect(service.peutSupprimerDefinitivement(bon('agent@cleanic.sn', 'BROUILLON'))).toBeFalse();
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

    it('ne peut pas supprimer définitivement un bon engagé', () => {
      expect(service.peutSupprimerDefinitivement(bon('agent@cleanic.sn', 'EFFECTIF'))).toBeFalse();
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

    it('peut soumettre son propre brouillon, sans être habilité par son rôle', () => {
      // Sans cela, un bon repris après refus serait corrigé mais jamais renvoyé.
      expect(service.peutSoumettre()).toBeFalse();
      expect(service.peutSoumettreBon(bon('agent@cleanic.sn'))).toBeTrue();
    });

    it('ne peut pas soumettre le brouillon d’un autre', () => {
      expect(service.peutSoumettreBon(bon('autre@cleanic.sn'))).toBeFalse();
    });

    it('ne peut pas modifier un bon déjà soumis', () => {
      expect(service.peutModifier(bon('agent@cleanic.sn', 'SOUMIS'))).toBeFalse();
    });

    it('peut reprendre son propre bon refusé', () => {
      expect(service.peutReprendre(bon('agent@cleanic.sn', 'REFUSE'))).toBeTrue();
    });

    it('ne peut jamais supprimer définitivement, même son propre bon effectif', () => {
      // Le repli permissif sur la propriété ne doit pas ouvrir une action gouvernée par le rôle.
      expect(service.peutSupprimerDefinitivement(bon('agent@cleanic.sn', 'EFFECTIF'))).toBeFalse();
      expect(service.peutSupprimerDefinitivement(bon(undefined, 'EFFECTIF'))).toBeFalse();
    });

    it('ne peut reprendre ni un bon d’un autre, ni un bon non refusé', () => {
      expect(service.peutReprendre(bon('autre@cleanic.sn', 'REFUSE'))).toBeFalse();
      expect(service.peutReprendre(bon('agent@cleanic.sn', 'BROUILLON'))).toBeFalse();
      expect(service.peutReprendre(bon('agent@cleanic.sn', 'SOUMIS'))).toBeFalse();
      expect(service.peutReprendre(bon('agent@cleanic.sn', 'EFFECTIF'))).toBeFalse();
    });
  });

  describe('repli transitoire — creeParEmail absent', () => {
    it('propriété acquise pour ne pas verrouiller avant livraison backend', () => {
      connecte('MAGASINIER', 'agent@cleanic.sn');
      const b = bon(undefined);
      expect(service.estProprietaire(b)).toBeTrue();
      expect(service.peutModifier(b)).toBeTrue();
    });

    it('la propriété acquise ouvre aussi la soumission et la reprise', () => {
      // Contrepartie assumée du repli : à retirer en même temps que lui.
      connecte('MAGASINIER', 'agent@cleanic.sn');
      expect(service.peutSoumettreBon(bon(undefined))).toBeTrue();
      expect(service.peutReprendre(bon(undefined, 'REFUSE'))).toBeTrue();
    });

    it('mais les restrictions purement par rôle restent actives', () => {
      connecte('MAGASINIER', 'agent@cleanic.sn');
      expect(service.peutSoumettre()).toBeFalse();
      expect(service.peutValider()).toBeFalse();
    });
  });
});
