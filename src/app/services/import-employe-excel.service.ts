import { Injectable } from '@angular/core';
import { Observable, from, map, of, switchMap, catchError } from 'rxjs';
import * as XLSX from 'xlsx';

import {
  COLONNES_TEMPLATE,
  DossierEmployeBulkPayload,
  ErreurImport,
  LigneImport,
  ResultatValidation,
} from '../models/import-employe.model';
import { DossierEmployeService } from './dossier-employe.service';

type Genre = 'HOMME' | 'FEMME';
type Statut = 'ACTIF' | 'EN_PERIODE_ESSAI' | 'SUSPENDU' | 'SORTI';
type SituationMatrimoniale = 'CELIBATAIRE' | 'MARIE';

const MATRICULE_EXEMPLE = 'EXEMPLE';

@Injectable({ providedIn: 'root' })
export class ImportEmployeExcelService {

  constructor(private dossierEmployeService: DossierEmployeService) {}

  // ──────────────────────────────────────────────────────────────────────
  // Génération du template Excel
  // ──────────────────────────────────────────────────────────────────────

  genererTemplate(): void {
    const wb = XLSX.utils.book_new();

    const feuilleEmployes = XLSX.utils.aoa_to_sheet([
      [...COLONNES_TEMPLATE],
      [
        MATRICULE_EXEMPLE,
        'Diop',
        'Aminata',
        '15/03/1990',
        'Femme',
        'Sénégalaise',
        '1 234 5678 9012',
        'Marié(e)',
        2,
        'Comptable',
        'Finance',
        'Siège Dakar',
        '01/09/2022',
        'Actif',
        '',
        '',
        '+221 77 123 45 67',
        'aminata.diop@example.sn',
        'Cité Keur Gorgui, Dakar',
        'Moussa Diop',
        'Époux',
        '+221 77 987 65 43',
      ],
    ]);
    feuilleEmployes['!cols'] = COLONNES_TEMPLATE.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, feuilleEmployes, 'Employés');

    const lignesConsignes = [
      ['Consignes de remplissage — Import des dossiers employés'],
      [''],
      ["1. Tous les champs marqués d'un * sont obligatoires."],
      ["2. La ligne d'exemple (matricule « EXEMPLE ») est ignorée à l'import — vous pouvez la supprimer ou la conserver."],
      [''],
      ['3. Formats attendus :'],
      ["   • Dates : dd/MM/yyyy (ex : 15/03/1990) ou date Excel native"],
      ['   • Email : adresse valide (ex : prenom.nom@exemple.sn)'],
      ["   • Nombre d'enfants / Durée période d'essai : entier positif"],
      [''],
      ['4. Valeurs acceptées (énumérations) :'],
      ["   • Genre : Homme, Femme"],
      ['   • Situation matrimoniale : Célibataire, Marié(e)'],
      ["   • Statut : Actif, En période d'essai, Suspendu, Sorti"],
      [''],
      ['5. Règles de validation :'],
      ['   • Matricule : unique dans le fichier ET en base de données'],
      ["   • Matricule supérieur hiérarchique : optionnel, doit exister en base OU être le matricule d'un autre employé du même fichier"],
      ["   • Durée période d'essai : obligatoire uniquement si Statut = En période d'essai"],
      [''],
      ['6. Champ photo non importable via Excel. À éditer ensuite depuis la fiche de l\'employé.'],
      [''],
      ["7. L'import est transactionnel : si une seule ligne échoue côté serveur, aucun employé n'est créé (tout est annulé). Corrigez les erreurs et relancez."],
    ];
    const feuilleConsignes = XLSX.utils.aoa_to_sheet(lignesConsignes);
    feuilleConsignes['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, feuilleConsignes, 'Consignes');

    XLSX.writeFile(wb, 'modele-import-employes.xlsx');
  }

  // ──────────────────────────────────────────────────────────────────────
  // Lecture du fichier Excel
  // ──────────────────────────────────────────────────────────────────────

  lireFichier(file: File): Observable<{ rows: Record<string, unknown>[]; enTetesManquants: string[] }> {
    return from(this.lireFichierAsync(file));
  }

  private async lireFichierAsync(
    file: File,
  ): Promise<{ rows: Record<string, unknown>[]; enTetesManquants: string[] }> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const nomFeuille = workbook.SheetNames.find(s => s.toLowerCase().startsWith('employ')) ?? workbook.SheetNames[0];
    const sheet = workbook.Sheets[nomFeuille];

    const matrice = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: false });
    if (matrice.length === 0) {
      return { rows: [], enTetesManquants: [...COLONNES_TEMPLATE] };
    }

    const enTetesFichier = (matrice[0] as unknown[]).map(v => String(v ?? '').trim());
    const enTetesManquants = COLONNES_TEMPLATE.filter(c => !enTetesFichier.includes(c));
    if (enTetesManquants.length > 0) {
      return { rows: [], enTetesManquants };
    }

    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < matrice.length; i++) {
      const cellules = matrice[i] as unknown[];
      const ligneVide = cellules.every(c => c === '' || c === null || c === undefined);
      if (ligneVide) continue;

      const obj: Record<string, unknown> = { __numeroLigne: i + 1 };
      enTetesFichier.forEach((entete, idx) => {
        obj[entete] = cellules[idx];
      });

      const matricule = String(obj[COLONNES_TEMPLATE[0]] ?? '').trim();
      if (matricule.toUpperCase() === MATRICULE_EXEMPLE) continue;

      rows.push(obj);
    }

    return { rows, enTetesManquants: [] };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Validation des lignes
  // ──────────────────────────────────────────────────────────────────────

  validerLignes(rows: Record<string, unknown>[]): Observable<ResultatValidation> {
    if (rows.length === 0) {
      return of(this.construireResultat([]));
    }

    return this.dossierEmployeService.getEmployes(0, 1000).pipe(
      catchError(() => of({ content: [], totalElements: 0 })),
      map(page => new Set((page.content ?? []).map(e => e.matricule.trim().toUpperCase()))),
      switchMap(matriculesEnBase => {
        const matriculesFichier = new Set<string>();
        rows.forEach(r => {
          const m = String(r[COLONNES_TEMPLATE[0]] ?? '').trim().toUpperCase();
          if (m) matriculesFichier.add(m);
        });

        const lignes: LigneImport[] = rows.map(row => this.validerLigne(row, matriculesEnBase, matriculesFichier, rows));
        return of(this.construireResultat(lignes));
      }),
    );
  }

  private construireResultat(lignes: LigneImport[]): ResultatValidation {
    const valides = lignes.filter(l => l.erreurs.length === 0).length;
    const enErreur = lignes.length - valides;
    const erreurs = lignes.flatMap(l => l.erreurs);
    return { lignes, total: lignes.length, valides, enErreur, erreurs };
  }

  private validerLigne(
    row: Record<string, unknown>,
    matriculesEnBase: Set<string>,
    matriculesFichier: Set<string>,
    toutesLesLignes: Record<string, unknown>[],
  ): LigneImport {
    const numeroLigne = Number(row['__numeroLigne']) || 0;
    const erreurs: ErreurImport[] = [];
    const pousser = (colonne: string, valeurRecue: unknown, message: string) =>
      erreurs.push({ numeroLigne, colonne, valeurRecue, message });

    const matricule = this.lireTexte(row, 'Matricule *');
    if (!matricule) pousser('Matricule *', row['Matricule *'], 'Matricule obligatoire.');
    else {
      const occurrences = toutesLesLignes.filter(
        r => String(r[COLONNES_TEMPLATE[0]] ?? '').trim().toUpperCase() === matricule.toUpperCase(),
      ).length;
      if (occurrences > 1) pousser('Matricule *', matricule, 'Matricule en doublon dans le fichier.');
      if (matriculesEnBase.has(matricule.toUpperCase()))
        pousser('Matricule *', matricule, 'Matricule déjà existant en base.');
    }

    const nom = this.lireTexte(row, 'Nom *');
    if (!nom) pousser('Nom *', row['Nom *'], 'Nom obligatoire.');

    const prenom = this.lireTexte(row, 'Prénom *');
    if (!prenom) pousser('Prénom *', row['Prénom *'], 'Prénom obligatoire.');

    const dateNaissance = this.lireDate(row, 'Date de naissance *', pousser);

    const genre = this.lireGenre(row, 'Genre *', pousser);

    const nationalite = this.lireTexte(row, 'Nationalité *');
    if (!nationalite) pousser('Nationalité *', row['Nationalité *'], 'Nationalité obligatoire.');

    const numeroIdentification = this.lireTexte(row, "Numéro d'identification (CNI)") || undefined;

    const situationMatrimoniale = this.lireSituationMatrimoniale(row, 'Situation matrimoniale', pousser);

    const nombreEnfants = this.lireEntierPositif(row, "Nombre d'enfants", false, pousser);

    const poste = this.lireTexte(row, 'Poste *');
    if (!poste) pousser('Poste *', row['Poste *'], 'Poste obligatoire.');

    const departement = this.lireTexte(row, 'Département *');
    if (!departement) pousser('Département *', row['Département *'], 'Département obligatoire.');

    const siteAffecte = this.lireTexte(row, 'Site affecté *');
    if (!siteAffecte) pousser('Site affecté *', row['Site affecté *'], 'Site affecté obligatoire.');

    const dateEntree = this.lireDate(row, "Date d'entrée *", pousser);

    const statut = this.lireStatut(row, 'Statut *', pousser);

    const superieurHierarchiqueMatricule = this.lireTexte(row, 'Matricule supérieur hiérarchique') || undefined;
    if (superieurHierarchiqueMatricule) {
      const ref = superieurHierarchiqueMatricule.toUpperCase();
      if (matricule && ref === matricule.toUpperCase()) {
        pousser('Matricule supérieur hiérarchique', superieurHierarchiqueMatricule, 'Un employé ne peut pas être son propre supérieur.');
      } else if (!matriculesEnBase.has(ref) && !matriculesFichier.has(ref)) {
        pousser(
          'Matricule supérieur hiérarchique',
          superieurHierarchiqueMatricule,
          'Matricule supérieur hiérarchique introuvable en base ni dans le fichier.',
        );
      }
    }

    const dureeEssaiMois = this.lireEntierPositif(row, "Durée période d'essai (mois)", false, pousser);
    if (statut === 'EN_PERIODE_ESSAI' && (dureeEssaiMois === undefined || dureeEssaiMois < 1)) {
      pousser(
        "Durée période d'essai (mois)",
        row["Durée période d'essai (mois)"],
        "Durée de période d'essai obligatoire (≥ 1) quand le statut est « En période d'essai ».",
      );
    }

    const telephone = this.lireTexte(row, 'Téléphone *');
    if (!telephone) pousser('Téléphone *', row['Téléphone *'], 'Téléphone obligatoire.');

    const email = this.lireTexte(row, 'Email *');
    if (!email) pousser('Email *', row['Email *'], 'Email obligatoire.');
    else if (!/^\S+@\S+\.\S+$/.test(email)) pousser('Email *', email, "Format d'email invalide.");

    const adresse = this.lireTexte(row, 'Adresse *');
    if (!adresse) pousser('Adresse *', row['Adresse *'], 'Adresse obligatoire.');

    const urgenceNom = this.lireTexte(row, 'Contact urgence - Nom *');
    if (!urgenceNom) pousser('Contact urgence - Nom *', row['Contact urgence - Nom *'], 'Nom du contact d\'urgence obligatoire.');

    const urgenceLien = this.lireTexte(row, 'Contact urgence - Lien de parenté *');
    if (!urgenceLien) pousser('Contact urgence - Lien de parenté *', row['Contact urgence - Lien de parenté *'], 'Lien de parenté obligatoire.');

    const urgenceTel = this.lireTexte(row, 'Contact urgence - Téléphone *');
    if (!urgenceTel) pousser('Contact urgence - Téléphone *', row['Contact urgence - Téléphone *'], 'Téléphone d\'urgence obligatoire.');

    const ligne: LigneImport = { numeroLigne, brut: row, erreurs };
    if (erreurs.length === 0) {
      ligne.payload = {
        numeroLigne,
        matricule,
        nom,
        prenom,
        dateNaissance: dateNaissance!,
        genre: genre!,
        nationalite,
        numeroIdentification,
        situationMatrimoniale,
        nombreEnfants,
        poste,
        departement,
        siteAffecte,
        dateEntree: dateEntree!,
        statut: statut!,
        superieurHierarchiqueMatricule,
        dureeEssaiMois: statut === 'EN_PERIODE_ESSAI' ? dureeEssaiMois : undefined,
        telephone,
        email,
        adresse,
        contactUrgence: { nom: urgenceNom, lienParente: urgenceLien, telephone: urgenceTel },
      };
    }
    return ligne;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Helpers de parsing
  // ──────────────────────────────────────────────────────────────────────

  private lireTexte(row: Record<string, unknown>, colonne: string): string {
    const v = row[colonne];
    if (v === undefined || v === null) return '';
    return String(v).trim();
  }

  private lireDate(
    row: Record<string, unknown>,
    colonne: string,
    pousser: (colonne: string, valeur: unknown, msg: string) => void,
  ): string | undefined {
    const v = row[colonne];
    if (v === undefined || v === null || v === '') {
      pousser(colonne, v, 'Date obligatoire.');
      return undefined;
    }

    let date: Date | null = null;
    if (v instanceof Date) {
      date = v;
    } else if (typeof v === 'number') {
      const parsed = XLSX.SSF.parse_date_code(v);
      if (parsed) date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    } else {
      const s = String(v).trim();
      const match = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
      if (match) {
        const j = parseInt(match[1], 10);
        const mo = parseInt(match[2], 10) - 1;
        let a = parseInt(match[3], 10);
        if (a < 100) a += 2000;
        date = new Date(Date.UTC(a, mo, j));
        if (date.getUTCDate() !== j || date.getUTCMonth() !== mo || date.getUTCFullYear() !== a) {
          date = null;
        }
      } else {
        const iso = new Date(s);
        if (!isNaN(iso.getTime())) date = iso;
      }
    }

    if (!date || isNaN(date.getTime())) {
      pousser(colonne, v, 'Date invalide — format attendu : dd/MM/yyyy.');
      return undefined;
    }

    const annee = date.getUTCFullYear();
    const anneeMax = new Date().getUTCFullYear() + 1;
    if (annee < 1900 || annee > anneeMax) {
      pousser(colonne, v, `Année invalide (doit être entre 1900 et ${anneeMax}).`);
      return undefined;
    }

    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${date.getUTCFullYear()}-${mm}-${dd}`;
  }

  private lireGenre(
    row: Record<string, unknown>,
    colonne: string,
    pousser: (colonne: string, valeur: unknown, msg: string) => void,
  ): Genre | undefined {
    const v = this.lireTexte(row, colonne);
    if (!v) {
      pousser(colonne, row[colonne], 'Genre obligatoire.');
      return undefined;
    }
    const norm = this.normaliser(v);
    if (norm === 'homme' || norm === 'h' || norm === 'm' || norm === 'male') return 'HOMME';
    if (norm === 'femme' || norm === 'f' || norm === 'female') return 'FEMME';
    pousser(colonne, v, 'Genre invalide — valeurs acceptées : Homme, Femme.');
    return undefined;
  }

  private lireSituationMatrimoniale(
    row: Record<string, unknown>,
    colonne: string,
    pousser: (colonne: string, valeur: unknown, msg: string) => void,
  ): SituationMatrimoniale | undefined {
    const v = this.lireTexte(row, colonne);
    if (!v) return undefined;
    const norm = this.normaliserEnum(v);
    if (norm === 'celibataire') return 'CELIBATAIRE';
    if (norm === 'marie' || norm === 'mariee') return 'MARIE';
    pousser(colonne, v, 'Situation matrimoniale invalide — valeurs acceptées : Célibataire, Marié(e).');
    return undefined;
  }

  private lireStatut(
    row: Record<string, unknown>,
    colonne: string,
    pousser: (colonne: string, valeur: unknown, msg: string) => void,
  ): Statut | undefined {
    const v = this.lireTexte(row, colonne);
    if (!v) {
      pousser(colonne, row[colonne], 'Statut obligatoire.');
      return undefined;
    }
    const norm = this.normaliserEnum(v);
    if (norm === 'actif') return 'ACTIF';
    if (norm === 'enperiodedessai' || norm === 'periodedessai' || norm === 'enperiodeessai') return 'EN_PERIODE_ESSAI';
    if (norm === 'suspendu') return 'SUSPENDU';
    if (norm === 'sorti') return 'SORTI';
    pousser(colonne, v, "Statut invalide — valeurs acceptées : Actif, En période d'essai, Suspendu, Sorti.");
    return undefined;
  }

  private lireEntierPositif(
    row: Record<string, unknown>,
    colonne: string,
    obligatoire: boolean,
    pousser: (colonne: string, valeur: unknown, msg: string) => void,
  ): number | undefined {
    const v = row[colonne];
    if (v === undefined || v === null || v === '') {
      if (obligatoire) pousser(colonne, v, `${colonne} obligatoire.`);
      return undefined;
    }
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      pousser(colonne, v, `${colonne} doit être un entier positif.`);
      return undefined;
    }
    return n;
  }

  private normaliser(s: string): string {
    return s
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  private normaliserEnum(s: string): string {
    return this.normaliser(s).replace(/['"\s_()\-.]/g, '');
  }

  // ──────────────────────────────────────────────────────────────────────
  // Construction du payload bulk
  // ──────────────────────────────────────────────────────────────────────

  construirePayload(lignes: LigneImport[]): DossierEmployeBulkPayload {
    const employes = lignes
      .filter(l => l.erreurs.length === 0 && l.payload)
      .map(l => l.payload!);
    return { employes };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Export du rapport d'erreurs
  // ──────────────────────────────────────────────────────────────────────

  exporterRapportErreurs(erreurs: ErreurImport[]): void {
    const rows = erreurs.map(e => ({
      Ligne: e.numeroLigne,
      Colonne: e.colonne,
      'Valeur reçue': e.valeurRecue === null || e.valeurRecue === undefined ? '' : String(e.valeurRecue),
      Message: e.message,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 30 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Erreurs');
    XLSX.writeFile(wb, 'rapport-erreurs-import.xlsx');
  }
}
