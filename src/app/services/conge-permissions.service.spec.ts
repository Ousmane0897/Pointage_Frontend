import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CongePermissionsService } from './conge-permissions.service';
import { CongeService } from './conge.service';
import { LoginService } from './login.service';
import {
  DemandeConge,
  MonProfilConge,
  NiveauValidation,
  StatutDemande,
} from '../models/conge.model';

describe('CongePermissionsService', () => {
  let service: CongePermissionsService;
  let login: jasmine.SpyObj<LoginService>;
  let conges: jasmine.SpyObj<CongeService>;

  const MOI = 'emp-moi';

  const demande = (
    statut: StatutDemande,
    extra: Partial<DemandeConge> = {},
  ): DemandeConge => ({
    id: 'd1',
    employeId: 'emp-autre',
    type: 'ANNUEL',
    dateDebut: '2026-08-10',
    dateFin: '2026-08-14',
    statut,
    ...extra,
  });

  const profil = (
    niveauxValidables: NiveauValidation[],
    employeId: string | undefined = MOI,
  ): MonProfilConge => ({
    employeId,
    email: 'moi@cleanic.sn',
    niveauxValidables,
  });

  /** Connecte un rôle et résout (ou non) le profil métier. */
  const connecte = (role: string, p: MonProfilConge | null = profil([])) => {
    login.getUserRole.and.returnValue(role);
    conges.getMonProfil.and.returnValue(
      p ? of(p) : throwError(() => ({ status: 404 })),
    );
    service.charger().subscribe();
  };

  beforeEach(() => {
    login = jasmine.createSpyObj<LoginService>('LoginService', ['getUserRole', 'getUserEmail']);
    conges = jasmine.createSpyObj<CongeService>('CongeService', ['getMonProfil']);
    TestBed.configureTestingModule({
      providers: [
        { provide: LoginService, useValue: login },
        { provide: CongeService, useValue: conges },
      ],
    });
    service = TestBed.inject(CongePermissionsService);
  });

  describe('peutValiderParMoi fait autorité', () => {
    it('autorise même si le rôle ne le permettrait pas', () => {
      connecte('EXPLOITATION');
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_RH', { peutValiderParMoi: true })))
        .toBeTrue();
    });

    it('refuse même pour un SUPERADMIN', () => {
      connecte('SUPERADMIN');
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_DG', { peutValiderParMoi: false })))
        .toBeFalse();
    });
  });

  describe('SUPERADMIN (Direction générale)', () => {
    beforeEach(() => connecte('SUPERADMIN', profil(['DIRECTION_GENERALE'])));

    it('valide les trois niveaux', () => {
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_SUPERIEUR'))).toBeTrue();
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_RH'))).toBeTrue();
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_DG'))).toBeTrue();
    });

    it('est reconnu comme Direction générale', () => {
      expect(service.estDirectionGenerale()).toBeTrue();
    });

    it('peut créer pour autrui et annuler la demande d’un tiers', () => {
      expect(service.peutCreerPourAutrui()).toBeTrue();
      expect(service.peutAnnuler(demande('EN_ATTENTE_RH'))).toBeTrue();
    });
  });

  describe('RH', () => {
    beforeEach(() => connecte('RH', profil(['RH'])));

    it('valide le niveau 2 uniquement', () => {
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_RH'))).toBeTrue();
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_SUPERIEUR'))).toBeFalse();
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_DG'))).toBeFalse();
    });

    it('peut créer pour autrui', () => {
      expect(service.peutCreerPourAutrui()).toBeTrue();
    });
  });

  describe('supérieur hiérarchique (sans rôle particulier)', () => {
    beforeEach(() => connecte('EXPLOITATION', profil(['SUPERIEUR'])));

    it('valide le niveau 1 de ses subordonnés seulement', () => {
      const mien = demande('EN_ATTENTE_SUPERIEUR', { superieurHierarchiqueId: MOI });
      const autre = demande('EN_ATTENTE_SUPERIEUR', { superieurHierarchiqueId: 'emp-x' });
      expect(service.peutValiderNiveau(mien)).toBeTrue();
      expect(service.peutValiderNiveau(autre)).toBeFalse();
    });

    it('ne valide ni le niveau RH ni le niveau Direction', () => {
      const d = { superieurHierarchiqueId: MOI };
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_RH', d))).toBeFalse();
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_DG', d))).toBeFalse();
    });

    it('ne peut pas créer pour autrui', () => {
      expect(service.peutCreerPourAutrui()).toBeFalse();
    });

    it('accède à la file de validation via ses niveaux validables', () => {
      expect(service.peutAccederFileValidation()).toBeTrue();
    });
  });

  describe('employé sans habilitation', () => {
    beforeEach(() => connecte('EXPLOITATION', profil([])));

    it('ne valide aucun niveau', () => {
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_SUPERIEUR'))).toBeFalse();
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_RH'))).toBeFalse();
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_DG'))).toBeFalse();
    });

    it('n’accède pas à la file de validation', () => {
      expect(service.peutAccederFileValidation()).toBeFalse();
    });

    it('annule sa propre demande mais pas celle d’un tiers', () => {
      expect(service.peutAnnuler(demande('EN_ATTENTE_RH', { employeId: MOI }))).toBeTrue();
      expect(service.peutAnnuler(demande('EN_ATTENTE_RH'))).toBeFalse();
    });
  });

  describe('statuts terminaux', () => {
    beforeEach(() => connecte('SUPERADMIN', profil(['DIRECTION_GENERALE'])));

    (['APPROUVE', 'REFUSE', 'ANNULE'] as StatutDemande[]).forEach(statut => {
      it(`n’autorise ni validation ni annulation sur ${statut}`, () => {
        expect(service.peutValiderNiveau(demande(statut))).toBeFalse();
        expect(service.peutAnnuler(demande(statut))).toBeFalse();
      });
    });
  });

  describe('legacy EN_ATTENTE', () => {
    it('est traité comme le niveau supérieur', () => {
      connecte('EXPLOITATION', profil(['SUPERIEUR']));
      expect(service.peutValiderNiveau(demande('EN_ATTENTE', { superieurHierarchiqueId: MOI })))
        .toBeTrue();
      expect(service.peutValiderNiveau(demande('EN_ATTENTE', { superieurHierarchiqueId: 'x' })))
        .toBeFalse();
    });
  });

  describe('profil non résolu (backend indisponible)', () => {
    beforeEach(() => connecte('EXPLOITATION', null));

    it('reste permissif sur le niveau 1 — le serveur tranchera', () => {
      expect(service.profilResolu()).toBeFalse();
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_SUPERIEUR'))).toBeTrue();
      expect(service.peutAnnuler(demande('EN_ATTENTE_SUPERIEUR'))).toBeTrue();
    });

    it('reste strict sur les niveaux gouvernés par un rôle', () => {
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_RH'))).toBeFalse();
      expect(service.peutValiderNiveau(demande('EN_ATTENTE_DG'))).toBeFalse();
    });

    it('laisse la file de validation s’ouvrir', () => {
      expect(service.peutAccederFileValidation()).toBeTrue();
    });
  });
});
