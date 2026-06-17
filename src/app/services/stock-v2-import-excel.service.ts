import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import * as XLSX from 'xlsx';

import {
  COLONNES_TEMPLATE_PRODUIT,
  ErreurImport,
  LigneImport,
  ProduitBulkPayload,
  ProduitImportPayload,
  ResultatValidation,
} from '../models/stock-v2-import.model';
import { TypeProduit, UniteStock } from '../models/stock-v2-produit.model';
import { LIBELLES_TYPE_PRODUIT, LIBELLES_UNITE } from '../constants/stock.constants';

const CODE_EXEMPLE = 'EXEMPLE';

/**
 * Service d'import Excel des produits — Module Stock v2 / 7.3.
 *
 * Réplique du pattern d'import des employés (RH) : template téléchargeable
 * (+ feuille « Consignes »), lecture tolérante des en-têtes, validation
 * ligne-par-ligne fail-soft, rapport d'erreurs exportable. La validation
 * d'unicité du code se fait dans le fichier ; le serveur tranche l'unicité
 * en base lors de l'import bulk transactionnel.
 */
@Injectable({ providedIn: 'root' })
export class StockV2ImportExcelService {

  // ──────────────────────────────────────────────────────────────────────
  // Génération du template Excel
  // ──────────────────────────────────────────────────────────────────────

  genererTemplate(): void {
    const wb = XLSX.utils.book_new();

    const feuilleProduits = XLSX.utils.aoa_to_sheet([
      [...COLONNES_TEMPLATE_PRODUIT],
      [
        CODE_EXEMPLE,
        'Détergent multi-surfaces 5L',
        'Consommable',
        'Produits d\'entretien',
        'Détergents',
        'L',
        'Cleanic Distribution',
        20,
        4500,
        100,
        'Oui',
        'Conditionné en bidon de 5 litres',
      ],
    ]);
    feuilleProduits['!cols'] = COLONNES_TEMPLATE_PRODUIT.map(() => ({ wch: 24 }));
    XLSX.utils.book_append_sheet(wb, feuilleProduits, 'Produits');

    const lignesConsignes = [
      ['Consignes de remplissage — Import du catalogue produits'],
      [''],
      ["1. Tous les champs marqués d'un * sont obligatoires."],
      ['2. La ligne d\'exemple (code « EXEMPLE ») est ignorée à l\'import — vous pouvez la supprimer ou la conserver.'],
      [''],
      ['3. Valeurs acceptées (énumérations) :'],
      ['   • Type : ' + Object.values(LIBELLES_TYPE_PRODUIT).join(', ')],
      ['   • Unité : ' + Object.values(LIBELLES_UNITE).join(', ')],
      ['   • Actif : Oui / Non (vide = Oui)'],
      [''],
      ['4. Formats attendus :'],
      ["   • Seuil d'alerte, Stock initial : entier positif"],
      ['   • Prix unitaire : montant en FCFA (entier, sans décimales ni séparateur)'],
      [''],
      ['5. Règles de validation :'],
      ['   • Code : unique dans le fichier ET en base de données'],
      ['   • Catégorie : créée automatiquement si elle n\'existe pas (par libellé)'],
      [''],
      ["6. La photo et la fiche technique ne sont pas importables via Excel — à éditer ensuite dans la fiche produit."],
      [''],
      ["7. L'import est transactionnel : si une seule ligne échoue côté serveur, aucun produit n'est créé (tout est annulé). Corrigez les erreurs et relancez."],
    ];
    const feuilleConsignes = XLSX.utils.aoa_to_sheet(lignesConsignes);
    feuilleConsignes['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, feuilleConsignes, 'Consignes');

    XLSX.writeFile(wb, 'modele-import-produits.xlsx');
  }

  // ──────────────────────────────────────────────────────────────────────
  // Lecture du fichier Excel
  // ──────────────────────────────────────────────────────────────────────

  lireFichier(
    file: File,
  ): Observable<{ rows: Record<string, unknown>[]; enTetesManquants: string[]; enTetesTrouves: string[] }> {
    return from(this.lireFichierAsync(file));
  }

  private async lireFichierAsync(
    file: File,
  ): Promise<{ rows: Record<string, unknown>[]; enTetesManquants: string[]; enTetesTrouves: string[] }> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const nomFeuille = workbook.SheetNames.find(s => s.toLowerCase().startsWith('produit')) ?? workbook.SheetNames[0];
    const sheet = workbook.Sheets[nomFeuille];

    const matrice = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: false });
    if (matrice.length === 0) {
      return { rows: [], enTetesManquants: [...COLONNES_TEMPLATE_PRODUIT], enTetesTrouves: [] };
    }

    const enTetesFichier = (matrice[0] as unknown[]).map(v => String(v ?? '').trim());
    const indexParEnteteNorm = new Map<string, number>();
    enTetesFichier.forEach((entete, idx) => {
      const norm = this.normaliserEntete(entete);
      if (norm && !indexParEnteteNorm.has(norm)) indexParEnteteNorm.set(norm, idx);
    });

    const colonneVersIndex = new Map<string, number>();
    const enTetesManquants: string[] = [];
    for (const colonne of COLONNES_TEMPLATE_PRODUIT) {
      const idx = indexParEnteteNorm.get(this.normaliserEntete(colonne));
      if (idx === undefined) enTetesManquants.push(colonne);
      else colonneVersIndex.set(colonne, idx);
    }
    if (enTetesManquants.length > 0) {
      return { rows: [], enTetesManquants, enTetesTrouves: enTetesFichier };
    }

    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < matrice.length; i++) {
      const cellules = matrice[i] as unknown[];
      const ligneVide = cellules.every(c => c === '' || c === null || c === undefined);
      if (ligneVide) continue;

      const obj: Record<string, unknown> = { __numeroLigne: i + 1 };
      colonneVersIndex.forEach((idx, colonne) => {
        obj[colonne] = cellules[idx];
      });

      const code = String(obj['Code *'] ?? '').trim();
      if (code.toUpperCase() === CODE_EXEMPLE) continue;

      rows.push(obj);
    }

    return { rows, enTetesManquants: [], enTetesTrouves: enTetesFichier };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Validation des lignes
  // ──────────────────────────────────────────────────────────────────────

  validerLignes(rows: Record<string, unknown>[]): Observable<ResultatValidation> {
    const lignes: LigneImport[] = rows.map(row => this.validerLigne(row, rows));
    return of(this.construireResultat(lignes));
  }

  private construireResultat(lignes: LigneImport[]): ResultatValidation {
    const valides = lignes.filter(l => l.erreurs.length === 0).length;
    const enErreur = lignes.length - valides;
    const erreurs = lignes.flatMap(l => l.erreurs);
    return { lignes, total: lignes.length, valides, enErreur, erreurs };
  }

  private validerLigne(
    row: Record<string, unknown>,
    toutesLesLignes: Record<string, unknown>[],
  ): LigneImport {
    const numeroLigne = Number(row['__numeroLigne']) || 0;
    const erreurs: ErreurImport[] = [];
    const pousser = (colonne: string, valeurRecue: unknown, message: string) =>
      erreurs.push({ numeroLigne, colonne, valeurRecue, message });

    const code = this.lireTexte(row, 'Code *');
    if (!code) pousser('Code *', row['Code *'], 'Code obligatoire.');
    else {
      const occurrences = toutesLesLignes.filter(
        r => String(r['Code *'] ?? '').trim().toUpperCase() === code.toUpperCase(),
      ).length;
      if (occurrences > 1) pousser('Code *', code, 'Code en doublon dans le fichier.');
    }

    const libelle = this.lireTexte(row, 'Libellé *');
    if (!libelle) pousser('Libellé *', row['Libellé *'], 'Libellé obligatoire.');

    const typeProduit = this.lireType(row, 'Type *', pousser);
    const unite = this.lireUnite(row, 'Unité *', pousser);

    const categorieLibelle = this.lireTexte(row, 'Catégorie') || undefined;
    const sousCategorie = this.lireTexte(row, 'Sous-catégorie') || undefined;
    const fournisseurPrincipal = this.lireTexte(row, 'Fournisseur principal') || undefined;

    const seuilAlerte = this.lireNombrePositif(row, "Seuil d'alerte *", true, pousser);
    const prixUnitaire = this.lireNombrePositif(row, 'Prix unitaire (FCFA) *', true, pousser);
    const stockInitial = this.lireNombrePositif(row, 'Stock initial', false, pousser);
    const actif = this.lireBooleen(row, 'Actif');
    const remarque = this.lireTexte(row, 'Remarque') || undefined;

    const ligne: LigneImport = { numeroLigne, brut: row, erreurs };
    if (erreurs.length === 0) {
      ligne.payload = {
        numeroLigne,
        code,
        libelle,
        typeProduit: typeProduit!,
        categorieLibelle,
        sousCategorie,
        unite: unite!,
        fournisseurPrincipal,
        seuilAlerte: seuilAlerte!,
        prixUnitaire: prixUnitaire!,
        stockInitial,
        actif,
        remarque,
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

  private lireType(
    row: Record<string, unknown>,
    colonne: string,
    pousser: (colonne: string, valeur: unknown, msg: string) => void,
  ): TypeProduit | undefined {
    const v = this.lireTexte(row, colonne);
    if (!v) {
      pousser(colonne, row[colonne], 'Type obligatoire.');
      return undefined;
    }
    const norm = this.normaliserEnum(v);
    const correspondance: Record<string, TypeProduit> = {
      produitfini: 'PRODUIT_FINI',
      matierepremiere: 'MATIERE_PREMIERE',
      consommable: 'CONSOMMABLE',
      epi: 'EPI',
      materiel: 'MATERIEL',
    };
    const found = correspondance[norm];
    if (found) return found;
    pousser(colonne, v, 'Type invalide — valeurs : ' + Object.values(LIBELLES_TYPE_PRODUIT).join(', ') + '.');
    return undefined;
  }

  private lireUnite(
    row: Record<string, unknown>,
    colonne: string,
    pousser: (colonne: string, valeur: unknown, msg: string) => void,
  ): UniteStock | undefined {
    const v = this.lireTexte(row, colonne);
    if (!v) {
      pousser(colonne, row[colonne], 'Unité obligatoire.');
      return undefined;
    }
    const norm = this.normaliserEnum(v);
    const correspondance: Record<string, UniteStock> = {
      kg: 'KG', g: 'G', l: 'L', ml: 'ML',
      pce: 'PIECE', piece: 'PIECE',
      m2: 'M2', m3: 'M3', m: 'METRE', metre: 'METRE',
      carton: 'CARTON', lot: 'LOT',
    };
    const found = correspondance[norm];
    if (found) return found;
    pousser(colonne, v, 'Unité invalide — valeurs : ' + Object.values(LIBELLES_UNITE).join(', ') + '.');
    return undefined;
  }

  private lireNombrePositif(
    row: Record<string, unknown>,
    colonne: string,
    obligatoire: boolean,
    pousser: (colonne: string, valeur: unknown, msg: string) => void,
  ): number | undefined {
    const v = row[colonne];
    if (v === undefined || v === null || v === '') {
      if (obligatoire) pousser(colonne, v, `${colonne} obligatoire.`);
      return obligatoire ? undefined : undefined;
    }
    const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) {
      pousser(colonne, v, `${colonne} doit être un nombre positif.`);
      return undefined;
    }
    return n;
  }

  private lireBooleen(row: Record<string, unknown>, colonne: string): boolean {
    const v = this.lireTexte(row, colonne);
    if (!v) return true; // vide = actif par défaut
    const norm = this.normaliserEnum(v);
    return !(norm === 'non' || norm === 'no' || norm === 'false' || norm === '0' || norm === 'inactif');
  }

  private normaliser(s: string): string {
    return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  private normaliserEnum(s: string): string {
    return this.normaliser(s).replace(/['"\s_()\-.]/g, '');
  }

  private normaliserEntete(s: string): string {
    return String(s ?? '')
      .replace(/ /g, ' ')
      .replace(/[‘’‛′]/g, "'")
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ──────────────────────────────────────────────────────────────────────
  // Construction du payload bulk + export rapport d'erreurs
  // ──────────────────────────────────────────────────────────────────────

  construirePayload(lignes: LigneImport[]): ProduitBulkPayload {
    const produits: ProduitImportPayload[] = lignes
      .filter(l => l.erreurs.length === 0 && l.payload)
      .map(l => l.payload!);
    return { produits };
  }

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
    XLSX.writeFile(wb, 'rapport-erreurs-import-produits.xlsx');
  }
}
