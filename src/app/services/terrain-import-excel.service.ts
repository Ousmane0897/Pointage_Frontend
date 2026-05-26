import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import * as XLSX from 'xlsx';
import {
  SiteClient,
  FrequencePassage,
} from '../models/terrain-site-client.model';

export interface ErreurImportSite {
  ligne: number;
  champ: string;
  message: string;
}

export interface LigneImportSite {
  numero: number;
  donnees: Partial<SiteClient>;
  erreurs: ErreurImportSite[];
}

export interface ResultatValidationImport {
  lignes: LigneImportSite[];
  total: number;
  valides: number;
  enErreur: number;
  erreurs: ErreurImportSite[];
}

export interface ResultatImportSites {
  succes: number;
  echecs: { numeroLigne: number; code: string; message: string }[];
}

const FREQUENCES_VALIDES: ReadonlySet<FrequencePassage> = new Set<FrequencePassage>([
  'QUOTIDIEN',
  'HEBDOMADAIRE',
  'BIMENSUEL',
  'MENSUEL',
  'TRIMESTRIEL',
  'PERSONNALISE',
]);

/**
 * Service d'import Excel des Sites Clients — Module Exploitation Terrain (5.2).
 *
 * Pattern identique à `import-employe-excel.service.ts` (module RH) : lecture
 * du fichier, validation ligne par ligne, rapport d'erreurs, puis appel bulk
 * transactionnel côté serveur.
 */
@Injectable({ providedIn: 'root' })
export class TerrainImportExcelService {

  /** Lit un fichier Excel et retourne le résultat de validation. */
  lireEtValiderFichier(file: File): Observable<ResultatValidationImport> {
    return from(file.arrayBuffer()).pipe(
      map((buffer) => {
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
        return this.validerLignes(rows);
      }),
    );
  }

  private validerLignes(rows: Record<string, unknown>[]): ResultatValidationImport {
    const lignes: LigneImportSite[] = rows.map((row, i) => {
      const numero = i + 2; // +1 pour header, +1 pour 1-based
      const erreurs: ErreurImportSite[] = [];
      const code = String(row['Code*'] ?? row['Code'] ?? '').trim();
      const nom = String(row['Nom*'] ?? row['Nom'] ?? '').trim();
      const adresse = String(row['Adresse*'] ?? row['Adresse'] ?? '').trim();
      const ville = String(row['Ville*'] ?? row['Ville'] ?? '').trim();
      const lat = this.toNombre(row['Latitude*'] ?? row['Latitude']);
      const lng = this.toNombre(row['Longitude*'] ?? row['Longitude']);
      const freq = String(row['Fréquence*'] ?? row['Fréquence'] ?? '').trim() as FrequencePassage;
      const contactNom = String(row['Contact nom*'] ?? row['Contact nom'] ?? '').trim();
      const contactTel = String(row['Contact tél.*'] ?? row['Contact tél.'] ?? '').trim();

      if (!code) erreurs.push({ ligne: numero, champ: 'Code', message: 'Code requis.' });
      if (!nom) erreurs.push({ ligne: numero, champ: 'Nom', message: 'Nom requis.' });
      if (!adresse) erreurs.push({ ligne: numero, champ: 'Adresse', message: 'Adresse requise.' });
      if (!ville) erreurs.push({ ligne: numero, champ: 'Ville', message: 'Ville requise.' });
      if (lat === null) {
        erreurs.push({ ligne: numero, champ: 'Latitude', message: 'Latitude numérique requise.' });
      } else if (lat < -90 || lat > 90) {
        erreurs.push({ ligne: numero, champ: 'Latitude', message: 'Latitude hors plage [-90, 90].' });
      }
      if (lng === null) {
        erreurs.push({ ligne: numero, champ: 'Longitude', message: 'Longitude numérique requise.' });
      } else if (lng < -180 || lng > 180) {
        erreurs.push({
          ligne: numero,
          champ: 'Longitude',
          message: 'Longitude hors plage [-180, 180].',
        });
      }
      if (!FREQUENCES_VALIDES.has(freq)) {
        erreurs.push({
          ligne: numero,
          champ: 'Fréquence',
          message: `Fréquence "${freq}" invalide. Attendu : QUOTIDIEN, HEBDOMADAIRE, BIMENSUEL, MENSUEL, TRIMESTRIEL ou PERSONNALISE.`,
        });
      }
      if (!contactNom) {
        erreurs.push({ ligne: numero, champ: 'Contact nom', message: 'Nom du contact requis.' });
      }
      if (!contactTel) {
        erreurs.push({ ligne: numero, champ: 'Contact tél.', message: 'Téléphone du contact requis.' });
      }

      const donnees: Partial<SiteClient> = {
        code,
        nom,
        raisonSociale: String(row['Raison sociale'] ?? '').trim() || undefined,
        adresse,
        ville,
        pays: String(row['Pays'] ?? '').trim() || undefined,
        coordonnees: lat !== null && lng !== null ? { latitude: lat, longitude: lng } : undefined,
        rayonToleranceM: this.toNombre(row['Rayon tolérance (m)']) ?? undefined,
        surfaceM2: this.toNombre(row['Surface (m²)']) ?? undefined,
        frequencePassage: FREQUENCES_VALIDES.has(freq) ? freq : undefined,
        frequencePersonnalisee: String(row['Fréquence personnalisée'] ?? '').trim() || undefined,
        contactPrincipal: {
          nom: contactNom,
          fonction: String(row['Contact fonction'] ?? '').trim() || undefined,
          telephone: contactTel,
          email: String(row['Contact email'] ?? '').trim() || undefined,
        },
        specificites: String(row['Spécificités'] ?? '').trim() || undefined,
        actif: this.toBooleen(row['Actif']),
      };

      return { numero, donnees, erreurs };
    });

    const total = lignes.length;
    const enErreur = lignes.filter((l) => l.erreurs.length > 0).length;
    const valides = total - enErreur;
    const erreurs = lignes.flatMap((l) => l.erreurs);

    return { lignes, total, valides, enErreur, erreurs };
  }

  private toNombre(v: unknown): number | null {
    if (v === '' || v === null || v === undefined) return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  private toBooleen(v: unknown): boolean {
    if (v === null || v === undefined || v === '') return true;
    const s = String(v).trim().toLowerCase();
    return s !== 'non' && s !== 'false' && s !== '0';
  }
}
