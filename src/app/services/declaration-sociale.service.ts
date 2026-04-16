import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { environment } from '../../environments/environment';
import {
  DeclarationSociale,
  FiltreDeclaration,
  LIBELLES_TYPE_DECLARATION,
  TypeDeclaration,
} from '../models/declaration-sociale.model';
import { BulletinPaie } from '../models/bulletin-paie.model';

/**
 * CRUD et exports des déclarations sociales (IPRES, CSS, Inspection du travail).
 * Agrège les bulletins validés d'une période pour produire les déclarations
 * réglementaires.
 */
@Injectable({ providedIn: 'root' })
export class DeclarationSocialeService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── CRUD / Persistance ───────────────────────────────────────────────────

  lister(filtres?: FiltreDeclaration): Observable<DeclarationSociale[]> {
    let params = new HttpParams();
    if (filtres?.type) params = params.set('type', filtres.type);
    if (filtres?.mois) params = params.set('mois', filtres.mois);
    if (filtres?.annee) params = params.set('annee', filtres.annee);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    return this.http.get<DeclarationSociale[]>(
      `${this.baseUrl}/paie/declarations`,
      { params },
    );
  }

  getById(id: string): Observable<DeclarationSociale> {
    return this.http.get<DeclarationSociale>(`${this.baseUrl}/paie/declarations/${id}`);
  }

  /**
   * Génère une déclaration côté serveur (agrégation des bulletins de la période).
   */
  generer(type: TypeDeclaration, mois: number | undefined, annee: number): Observable<DeclarationSociale> {
    let params = new HttpParams().set('type', type).set('annee', annee);
    if (mois !== undefined) params = params.set('mois', mois);
    return this.http.post<DeclarationSociale>(
      `${this.baseUrl}/paie/declarations/generer`,
      null,
      { params },
    );
  }

  enregistrer(declaration: DeclarationSociale): Observable<DeclarationSociale> {
    return this.http.post<DeclarationSociale>(
      `${this.baseUrl}/paie/declarations`,
      declaration,
    );
  }

  marquerTransmise(id: string, referenceExterne: string): Observable<DeclarationSociale> {
    return this.http.patch<DeclarationSociale>(
      `${this.baseUrl}/paie/declarations/${id}/transmettre`,
      { referenceExterne },
    );
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/paie/declarations/${id}`);
  }

  // ─── Agrégation côté client (fallback offline / preview) ──────────────────

  /**
   * Construit une déclaration à partir d'une liste de bulletins.
   * Utile pour l'aperçu avant persistance et pour générer les exports
   * sans aller-retour serveur.
   */
  construireDepuisBulletins(
    type: TypeDeclaration,
    bulletins: BulletinPaie[],
    mois: number | undefined,
    annee: number,
  ): DeclarationSociale {
    const lignes = bulletins.map(b => {
      const ipresSal = this.extraireMontant(b, ['IPRES_RG', 'IPRES_RC'], 'salarial');
      const ipresEmp = this.extraireMontant(b, ['IPRES_RG', 'IPRES_RC'], 'patronal');
      const cssSal = this.extraireMontant(b, ['CSS_ATMP'], 'salarial');
      const cssEmp = this.extraireMontant(b, ['CSS_ATMP', 'CSS_PF'], 'patronal');

      return {
        employeId: b.employeId,
        matricule: b.matricule,
        nom: b.nom,
        prenom: b.prenom,
        numeroIpres: b.numeroIpres,
        numeroCss: b.numeroCss,
        brutImposable: b.salaireBrut,
        assietteIpres: b.salaireBrut,
        cotisationIpresSalarie: ipresSal,
        cotisationIpresEmployeur: ipresEmp,
        assietteCss: b.salaireBrut,
        cotisationCssSalarie: cssSal,
        cotisationCssEmployeur: cssEmp,
        impotRevenu: b.impotRevenu,
        trimf: b.trimf,
        joursTravailles: b.joursTravailles,
      };
    });

    const totalBrut = this.sum(lignes, 'brutImposable');
    const totalIpresSalarie = this.sum(lignes, 'cotisationIpresSalarie');
    const totalIpresEmployeur = this.sum(lignes, 'cotisationIpresEmployeur');
    const totalCssSalarie = this.sum(lignes, 'cotisationCssSalarie');
    const totalCssEmployeur = this.sum(lignes, 'cotisationCssEmployeur');
    const totalIr = this.sum(lignes, 'impotRevenu');
    const totalTrimf = this.sum(lignes, 'trimf');

    let totalPayable = 0;
    if (type === 'IPRES_MENSUELLE' || type === 'IPRES_ANNUELLE') {
      totalPayable = totalIpresSalarie + totalIpresEmployeur;
    } else if (type === 'CSS_MENSUELLE' || type === 'CSS_ANNUELLE') {
      totalPayable = totalCssSalarie + totalCssEmployeur;
    } else {
      totalPayable = totalIr + totalTrimf;
    }

    const libellePeriode = mois
      ? `${this.nomMois(mois)} ${annee}`
      : `Année ${annee}`;

    return {
      type,
      libelle: `${LIBELLES_TYPE_DECLARATION[type]} — ${libellePeriode}`,
      mois,
      annee,
      lignes,
      totalBrut,
      totalIpresSalarie,
      totalIpresEmployeur,
      totalCssSalarie,
      totalCssEmployeur,
      totalIr,
      totalTrimf,
      totalPayable,
      effectif: lignes.length,
      statut: 'BROUILLON',
      dateGeneration: new Date().toISOString().slice(0, 10),
    };
  }

  // ─── Exports ──────────────────────────────────────────────────────────────

  exportExcel(declaration: DeclarationSociale): void {
    const rows = declaration.lignes.map(l => ({
      'Matricule': l.matricule,
      'Nom': l.nom,
      'Prénom': l.prenom,
      'N° IPRES': l.numeroIpres ?? '',
      'N° CSS': l.numeroCss ?? '',
      'Brut imposable': l.brutImposable,
      'Assiette IPRES': l.assietteIpres,
      'IPRES salarié': l.cotisationIpresSalarie,
      'IPRES employeur': l.cotisationIpresEmployeur,
      'Assiette CSS': l.assietteCss,
      'CSS salarié': l.cotisationCssSalarie,
      'CSS employeur': l.cotisationCssEmployeur,
      'IR': l.impotRevenu,
      'TRIMF': l.trimf,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Déclaration');
    XLSX.writeFile(wb, `${this.slug(declaration.libelle)}.xlsx`);
  }

  exportPdf(declaration: DeclarationSociale): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(declaration.libelle, 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Effectif : ${declaration.effectif} employé(s)`, 14, 22);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 14, 22, { align: 'right' });

    autoTable(doc, {
      startY: 28,
      head: [[
        'Matricule', 'Nom', 'Prénom', 'Brut',
        'IPRES sal.', 'IPRES emp.', 'CSS sal.', 'CSS emp.', 'IR', 'TRIMF',
      ]],
      body: declaration.lignes.map(l => [
        l.matricule,
        l.nom,
        l.prenom,
        this.formatFCFA(l.brutImposable),
        this.formatFCFA(l.cotisationIpresSalarie),
        this.formatFCFA(l.cotisationIpresEmployeur),
        this.formatFCFA(l.cotisationCssSalarie),
        this.formatFCFA(l.cotisationCssEmployeur),
        this.formatFCFA(l.impotRevenu),
        this.formatFCFA(l.trimf),
      ]),
      foot: [[
        '', '', 'TOTAL',
        this.formatFCFA(declaration.totalBrut),
        this.formatFCFA(declaration.totalIpresSalarie),
        this.formatFCFA(declaration.totalIpresEmployeur),
        this.formatFCFA(declaration.totalCssSalarie),
        this.formatFCFA(declaration.totalCssEmployeur),
        this.formatFCFA(declaration.totalIr),
        this.formatFCFA(declaration.totalTrimf),
      ]],
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
        6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' },
      },
    });

    const finY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total à verser : ${this.formatFCFA(declaration.totalPayable)}`, 14, finY);

    doc.save(`${this.slug(declaration.libelle)}.pdf`);
  }

  // ─── Helpers privés ───────────────────────────────────────────────────────

  private extraireMontant(
    b: BulletinPaie,
    codes: string[],
    type: 'salarial' | 'patronal',
  ): number {
    return b.lignes
      .filter(l => codes.includes(l.code))
      .reduce((sum, l) => sum + ((type === 'salarial' ? l.montantSalarial : l.montantPatronal) ?? 0), 0);
  }

  private sum<T, K extends keyof T>(items: T[], key: K): number {
    return items.reduce((s, i) => s + (Number(i[key]) || 0), 0);
  }

  private formatFCFA(montant: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(montant));
  }

  private nomMois(mois: number): string {
    const noms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    return noms[(mois - 1 + 12) % 12] ?? '';
  }

  private slug(s: string): string {
    return s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
