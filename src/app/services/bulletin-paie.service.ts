import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageResponse } from '../models/pageResponse.model';
import {
  BulletinPaie,
  FiltreBulletin,
  LigneBulletin,
  PeriodePaie,
  StatutBulletin,
} from '../models/bulletin-paie.model';
import { CategorieProfessionnelle } from '../models/grille-salariale.model';
import { EmployeComplet } from '../models/employe-complet.model';
import { RecapitulatifMensuel } from '../models/recapitulatif-mensuel.model';
import {
  BAREME_IR,
  BAREME_TRIMF,
  MAJORATION_HS_MAPPING,
  PARAMETRES_PAIE,
  TAUX_CSS,
  TAUX_IPRES,
} from '../constants/paie.constants';

/**
 * Service principal du calcul & de la persistance des bulletins de paie.
 *
 * Le calcul est réalisé côté client (méthode pure `calculerBulletin`) pour
 * offrir un aperçu instantané avant persistance. La même logique pourra être
 * rejouée côté serveur pour la validation définitive.
 */
@Injectable({ providedIn: 'root' })
export class BulletinPaieService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── CRUD / Persistance ───────────────────────────────────────────────────

  lister(
    page = 0,
    size = 10,
    filtres?: FiltreBulletin,
  ): Observable<PageResponse<BulletinPaie>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filtres?.employeId) params = params.set('employeId', filtres.employeId);
    if (filtres?.departement) params = params.set('departement', filtres.departement);
    if (filtres?.mois) params = params.set('mois', filtres.mois);
    if (filtres?.annee) params = params.set('annee', filtres.annee);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.q) params = params.set('q', filtres.q);

    return this.http.get<PageResponse<BulletinPaie>>(
      `${this.baseUrl}/paie/bulletins`,
      { params },
    );
  }

  getById(id: string): Observable<BulletinPaie> {
    return this.http.get<BulletinPaie>(`${this.baseUrl}/paie/bulletins/${id}`);
  }

  getByEmploye(employeId: string): Observable<BulletinPaie[]> {
    return this.http.get<BulletinPaie[]>(
      `${this.baseUrl}/paie/bulletins/employe/${employeId}`,
    );
  }

  enregistrer(bulletin: BulletinPaie): Observable<BulletinPaie> {
    return this.http.post<BulletinPaie>(`${this.baseUrl}/paie/bulletins`, bulletin);
  }

  modifier(id: string, bulletin: BulletinPaie): Observable<BulletinPaie> {
    return this.http.put<BulletinPaie>(`${this.baseUrl}/paie/bulletins/${id}`, bulletin);
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/paie/bulletins/${id}`);
  }

  changerStatut(id: string, statut: StatutBulletin, commentaire?: string): Observable<BulletinPaie> {
    return this.http.patch<BulletinPaie>(
      `${this.baseUrl}/paie/bulletins/${id}/statut`,
      { statut, commentaire },
    );
  }

  // ─── Calcul côté client (méthode pure & testable) ─────────────────────────

  /**
   * Calcule un bulletin de paie complet à partir des données employé, de la
   * catégorie professionnelle et du récapitulatif mensuel (6.2).
   *
   * La logique est entièrement locale — elle n'appelle aucun endpoint HTTP,
   * ce qui permet un preview instantané dans l'UI.
   */
  calculerBulletin(
    employe: EmployeComplet,
    categorie: CategorieProfessionnelle | null,
    recap: RecapitulatifMensuel | null,
    periode: PeriodePaie,
  ): BulletinPaie {
    const lignes: LigneBulletin[] = [];

    // ─ 1. Gains ─────────────────────────────────────────────────────────────
    const salaireBase = this.parseMontant(employe.salaireDeBase)
      || (categorie?.salaireBase ?? 0);

    lignes.push({
      code: 'SAL_BASE',
      libelle: 'Salaire de base',
      nature: 'GAIN',
      montantSalarial: salaireBase,
    });

    const primeTransport = this.parseMontant(employe.primeTransport);
    if (primeTransport > 0) {
      lignes.push({
        code: 'PRIME_TRANSP',
        libelle: 'Prime de transport',
        nature: 'GAIN',
        montantSalarial: primeTransport,
      });
    }

    const primeAssiduite = this.parseMontant(employe.primeAssiduite);
    if (primeAssiduite > 0) {
      lignes.push({
        code: 'PRIME_ASSID',
        libelle: 'Prime d\'assiduité',
        nature: 'GAIN',
        montantSalarial: primeAssiduite,
      });
    }

    const primeRisque = this.parseMontant(employe.primeRisque);
    if (primeRisque > 0) {
      lignes.push({
        code: 'PRIME_RISQ',
        libelle: 'Prime de risque',
        nature: 'GAIN',
        montantSalarial: primeRisque,
      });
    }

    // Primes & indemnités provenant de la catégorie (non redondantes)
    categorie?.primes?.forEach((p, idx) => {
      lignes.push({
        code: `PRIME_CAT_${idx}`,
        libelle: p.libelle,
        nature: 'GAIN',
        montantSalarial: p.montant,
      });
    });
    categorie?.indemnites?.forEach((i, idx) => {
      lignes.push({
        code: `INDEM_CAT_${idx}`,
        libelle: i.libelle,
        nature: 'GAIN',
        montantSalarial: i.montant,
      });
    });

    // Heures supplémentaires (depuis le récap mensuel 6.2)
    const tauxHoraire = salaireBase / PARAMETRES_PAIE.heuresLegalesMensuelles;
    let montantHS = 0;
    if (recap?.heuresSupParType) {
      const hsParType = recap.heuresSupParType;
      if (hsParType.t15) montantHS += hsParType.t15 * tauxHoraire * MAJORATION_HS_MAPPING.T_15;
      if (hsParType.t40) montantHS += hsParType.t40 * tauxHoraire * MAJORATION_HS_MAPPING.T_40;
      if (hsParType.t60) montantHS += hsParType.t60 * tauxHoraire * MAJORATION_HS_MAPPING.T_60;
      if (hsParType.t100) montantHS += hsParType.t100 * tauxHoraire * MAJORATION_HS_MAPPING.T_100;
    }
    montantHS = Math.round(montantHS);
    if (montantHS > 0) {
      lignes.push({
        code: 'HS_TOTAL',
        libelle: 'Heures supplémentaires',
        nature: 'GAIN',
        montantSalarial: montantHS,
      });
    }

    const salaireBrut = lignes
      .filter(l => l.nature === 'GAIN')
      .reduce((sum, l) => sum + (l.montantSalarial ?? 0), 0);

    // ─ 2. Cotisations IPRES ─────────────────────────────────────────────────
    const assietteRG = Math.min(salaireBrut, TAUX_IPRES.regimeGeneral.plafondMensuel ?? salaireBrut);
    const ipresSal = Math.round(assietteRG * TAUX_IPRES.regimeGeneral.salarie);
    const ipresEmp = Math.round(assietteRG * TAUX_IPRES.regimeGeneral.employeur);

    lignes.push({
      code: 'IPRES_RG',
      libelle: 'IPRES — Régime général',
      nature: 'RETENUE_SALARIALE',
      base: assietteRG,
      taux: TAUX_IPRES.regimeGeneral.salarie,
      montantSalarial: ipresSal,
      montantPatronal: ipresEmp,
    });

    let ipresSalRC = 0;
    let ipresEmpRC = 0;
    if (categorie?.regimeIpres === 'REGIME_COMPLEMENTAIRE') {
      const assietteRC = Math.min(salaireBrut, TAUX_IPRES.regimeComplementaire.plafondMensuel ?? salaireBrut);
      ipresSalRC = Math.round(assietteRC * TAUX_IPRES.regimeComplementaire.salarie);
      ipresEmpRC = Math.round(assietteRC * TAUX_IPRES.regimeComplementaire.employeur);
      lignes.push({
        code: 'IPRES_RC',
        libelle: 'IPRES — Régime complémentaire cadres',
        nature: 'RETENUE_SALARIALE',
        base: assietteRC,
        taux: TAUX_IPRES.regimeComplementaire.salarie,
        montantSalarial: ipresSalRC,
        montantPatronal: ipresEmpRC,
      });
    }

    // ─ 3. Cotisations CSS ───────────────────────────────────────────────────
    const tauxAtMp = categorie?.tauxAtMp ?? TAUX_CSS.accidentTravail.employeur;
    const cssAtSal = Math.round(salaireBrut * TAUX_CSS.accidentTravail.salarie);
    const cssAtEmp = Math.round(salaireBrut * tauxAtMp);
    lignes.push({
      code: 'CSS_ATMP',
      libelle: 'CSS — Accidents du travail / MP',
      nature: 'RETENUE_SALARIALE',
      base: salaireBrut,
      taux: TAUX_CSS.accidentTravail.salarie,
      montantSalarial: cssAtSal,
      montantPatronal: cssAtEmp,
    });

    const cssPfEmp = Math.round(salaireBrut * TAUX_CSS.prestationsFamiliales.employeur);
    lignes.push({
      code: 'CSS_PF',
      libelle: 'CSS — Prestations familiales',
      nature: 'COTISATION_PATRONALE',
      base: salaireBrut,
      taux: TAUX_CSS.prestationsFamiliales.employeur,
      montantSalarial: 0,
      montantPatronal: cssPfEmp,
    });

    // ─ 4. Impôt sur le revenu ───────────────────────────────────────────────
    const totalCotSal = ipresSal + ipresSalRC + cssAtSal;
    const brutImposableMensuel = salaireBrut - totalCotSal;
    const brutImposableAnnuel = brutImposableMensuel * 12;
    const irAnnuel = this.calculerIR(brutImposableAnnuel);
    const irMensuel = Math.round(irAnnuel / 12);

    lignes.push({
      code: 'IR',
      libelle: 'Impôt sur le revenu',
      nature: 'RETENUE_SALARIALE',
      base: brutImposableMensuel,
      montantSalarial: irMensuel,
    });

    // ─ 5. TRIMF ─────────────────────────────────────────────────────────────
    const trimf = this.calculerTRIMF(salaireBrut * 12);
    lignes.push({
      code: 'TRIMF',
      libelle: 'TRIMF',
      nature: 'RETENUE_SALARIALE',
      montantSalarial: trimf,
    });

    // ─ 6. Totaux & net à payer ──────────────────────────────────────────────
    const totalCotisationsSalariales = ipresSal + ipresSalRC + cssAtSal + irMensuel + trimf;
    const totalCotisationsPatronales = ipresEmp + ipresEmpRC + cssAtEmp + cssPfEmp;
    const netAPayer = salaireBrut - totalCotisationsSalariales;
    const coutTotalEmployeur = salaireBrut + totalCotisationsPatronales;

    return {
      employeId: employe.id ?? employe.agentId,
      matricule: employe.matricule,
      nom: employe.nom,
      prenom: employe.prenom,
      poste: employe.poste,
      departement: employe.agence?.[0],
      categorieCode: categorie?.code,
      numeroIpres: employe.cnssOuIpres,
      numeroCss: employe.cnssOuIpres,
      rib: employe.ribCompteBancaire,
      banque: employe.banque,

      periode,

      joursTravailles: recap?.joursTravailles ?? 0,
      joursAbsence: recap?.joursAbsence ?? 0,
      joursConge: recap?.joursConge ?? 0,
      heuresSupTotal: recap?.heuresSupTotal ?? 0,
      heuresSupMajoreesEquivalent: recap?.heuresSupMajoreesEquivalent ?? 0,

      lignes,

      salaireBrut,
      totalCotisationsSalariales,
      totalCotisationsPatronales,
      impotRevenu: irMensuel,
      trimf,
      netAPayer,
      coutTotalEmployeur,

      statut: 'BROUILLON',
      dateCalcul: new Date().toISOString().slice(0, 10),
    };
  }

  /** Calcul de l'IR annuel selon le barème progressif. */
  calculerIR(brutImposableAnnuel: number): number {
    if (brutImposableAnnuel <= 0) return 0;
    let impot = 0;
    for (const tranche of BAREME_IR) {
      if (brutImposableAnnuel <= tranche.min) break;
      const plafond = Math.min(brutImposableAnnuel, tranche.max);
      impot += (plafond - tranche.min) * tranche.taux;
    }
    return Math.round(impot);
  }

  /** Montant mensuel TRIMF selon la tranche de brut annuel. */
  calculerTRIMF(brutAnnuel: number): number {
    const tranche = BAREME_TRIMF.find(t => brutAnnuel >= t.minAnnuel && brutAnnuel < t.maxAnnuel);
    return tranche?.montantMensuel ?? 0;
  }

  private parseMontant(v: string | number | undefined | null): number {
    if (v === undefined || v === null || v === '') return 0;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
}
