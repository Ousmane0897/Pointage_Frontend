import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { BulletinPaieService } from './bulletin-paie.service';
import { BulletinPaie, PeriodePaie } from '../models/bulletin-paie.model';
import { CategorieProfessionnelle } from '../models/grille-salariale.model';
import { RecapitulatifMensuel } from '../models/recapitulatif-mensuel.model';
import { DossierEmploye } from '../models/dossier-employe.model';

/**
 * Prorata du salaire de base sur les jours réellement travaillés.
 *
 * ⚠ Le service ne fait **aucun appel HTTP** pour ce calcul : il est intégralement local.
 */
describe('BulletinPaieService — prorata', () => {

  const PERIODE: PeriodePaie = { mois: 9, annee: 2026 };
  const SALAIRE_BASE = 200_000;

  let service: BulletinPaieService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BulletinPaieService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BulletinPaieService);
  });

  const employe = { id: 'e1', agentId: '1001', matricule: 'M1', nom: 'Diop', prenom: 'Awa' } as DossierEmploye;

  const categorie = {
    code: 'EMPLOYE', libelle: 'Employé', salaireBase: SALAIRE_BASE,
    primes: [], indemnites: [], regimeIpres: 'RG', actif: true,
  } as unknown as CategorieProfessionnelle;

  function recap(joursTravailles: number, joursOuvrables: number): RecapitulatifMensuel {
    return {
      employeId: 'e1', matricule: 'M1', nom: 'Diop', prenom: 'Awa', departement: 'Exploitation',
      mois: 9, annee: 2026,
      joursOuvrables, joursTravailles, joursAbsence: 0, joursConge: 0,
      nombreRetards: 0, minutesRetardTotal: 0,
      heuresSupTotal: 0, heuresSupMajoreesEquivalent: 0,
    };
  }

  function ligneSalaireBase(b: BulletinPaie) {
    return b.lignes.find(l => l.code === 'SAL_BASE')!;
  }

  it('ne proratise pas un mois complet', () => {
    const b = service.calculerBulletin(employe, categorie, recap(22, 22), PERIODE);

    expect(b.salaireBaseProratise).toBe(SALAIRE_BASE);
    expect(ligneSalaireBase(b).libelle).toBe('Salaire de base');
  });

  it('proratise un mois partiel et affiche le ratio', () => {
    const b = service.calculerBulletin(employe, categorie, recap(11, 22), PERIODE);

    expect(b.salaireBaseProratise).toBe(100_000);
    expect(ligneSalaireBase(b).montantSalarial).toBe(100_000);
    // Le libellé porte le détail : un montant amputé sans justification serait illisible.
    expect(ligneSalaireBase(b).libelle).toBe('Salaire de base (11/22 j)');
  });

  it('N’APPLIQUE AUCUN PRORATA quand le récapitulatif est absent', () => {
    // ⚠ Le composant de calcul retombe silencieusement sur `null` en cas d'erreur, donc
    // sur 0 jour : un prorata aveugle sortirait un net à ZÉRO — bien pire qu'un mois plein.
    const b = service.calculerBulletin(employe, categorie, null, PERIODE);

    expect(b.salaireBaseProratise).toBe(SALAIRE_BASE);
    expect(b.joursOuvrables).toBe(0);
  });

  it('n’applique aucun prorata quand les jours ouvrables sont à zéro', () => {
    const b = service.calculerBulletin(employe, categorie, recap(0, 0), PERIODE);

    expect(b.salaireBaseProratise).toBe(SALAIRE_BASE);
  });

  it('plafonne le ratio à 1 quand un férié a été travaillé', () => {
    // ⚠ `joursTravailles` inclut les fériés travaillés et peut dépasser `joursOuvrables`.
    // Sans plafond, un férié travaillé majorerait le salaire de base — c'est le rôle de la
    // majoration des heures supplémentaires, pas du prorata.
    const b = service.calculerBulletin(employe, categorie, recap(23, 21), PERIODE);

    expect(b.salaireBaseProratise).toBe(SALAIRE_BASE);
    expect(ligneSalaireBase(b).libelle).toBe('Salaire de base');
  });

  it('le prorata porte sur le SEUL salaire de base, pas sur les primes', () => {
    const avecPrime = {
      ...categorie,
      primes: [{ libelle: 'Prime de transport', montant: 26_000 }],
    } as unknown as CategorieProfessionnelle;

    const b = service.calculerBulletin(employe, avecPrime, recap(11, 22), PERIODE);

    const prime = b.lignes.find(l => l.libelle === 'Prime de transport')!;
    expect(prime.montantSalarial).toBe(26_000);
    expect(ligneSalaireBase(b).montantSalarial).toBe(100_000);
  });

  it('le taux horaire des heures sup reste calculé sur le salaire CONTRACTUEL', () => {
    // Le prorata mesure une présence, il ne dévalue pas l'heure de travail : proratiser le
    // taux ferait payer moins cher les HS d'un agent qui a été absent.
    const mois = { ...recap(11, 22), heuresSupParType: { t15: 10 } };
    const partiel = service.calculerBulletin(employe, categorie, mois, PERIODE);

    const complet = service.calculerBulletin(
      employe, categorie, { ...recap(22, 22), heuresSupParType: { t15: 10 } }, PERIODE);

    const hs = (b: BulletinPaie) =>
      b.lignes.filter(l => l.code.startsWith('HS')).reduce((s, l) => s + (l.montantSalarial ?? 0), 0);

    expect(hs(partiel)).toBe(hs(complet));
    expect(hs(partiel)).toBeGreaterThan(0);
  });
});
