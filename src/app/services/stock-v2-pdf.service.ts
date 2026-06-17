import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Inventaire } from '../models/stock-v2-inventaire.model';
import { BonCommandePrevisionnel } from '../models/stock-v2-approvisionnement.model';
import { SyntheseMensuelle } from '../models/stock-v2-synthese.model';
import { RapportTableauBordStock, FiltreTableauBordStock } from '../models/stock-v2-tableau-bord.model';
import {
  LIBELLES_STATUT_INVENTAIRE,
  LIBELLES_UNITE,
  DEVISE,
} from '../constants/stock.constants';

const BLEU: [number, number, number] = [49, 46, 129]; // indigo-900

/**
 * Service de génération PDF (jsPDF + jspdf-autotable) — Module Stock v2 / 7.3.
 *
 * Gère : PV d'inventaire, bon de commande prévisionnel, synthèse mensuelle,
 * rapport du tableau de bord.
 */
@Injectable({ providedIn: 'root' })
export class StockV2PdfService {

  // ─── PV d'inventaire ──────────────────────────────────────────────────────

  genererPvInventaire(inv: Inventaire): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("PROCÈS-VERBAL D'INVENTAIRE", pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Référence : ${inv.reference ?? '—'}`, 14, 28);
    doc.text(`Libellé : ${inv.libelle}`, 14, 34);
    doc.text(`Date planifiée : ${this.formatDate(inv.datePlanifiee)}`, 14, 40);
    doc.text(`Site : ${inv.siteNom ?? 'Tous sites'}`, 14, 46);
    doc.text(`Statut : ${LIBELLES_STATUT_INVENTAIRE[inv.statut]}`, 120, 28);
    if (inv.dateCloture) doc.text(`Clôturé le : ${this.formatDate(inv.dateCloture)}`, 120, 34);
    if (inv.responsable) doc.text(`Responsable : ${inv.responsable}`, 120, 40);

    autoTable(doc, {
      startY: 54,
      head: [['Code', 'Produit', 'Théorique', 'Physique', 'Écart', 'Justification']],
      body: inv.lignes.map(l => [
        l.produitCode ?? '',
        l.produitLibelle ?? l.produitId,
        this.fmtQte(l.qteTheorique, l.unite),
        l.qtePhysique == null ? '—' : this.fmtQte(l.qtePhysique, l.unite),
        l.ecart == null ? '—' : this.fmtNombre(l.ecart),
        l.justification ?? '',
      ]),
      headStyles: { fillColor: BLEU, textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    });

    let y = this.finalY(doc) + 14;
    doc.setFontSize(9);
    doc.text('Signature responsable :', 14, y);
    doc.text('Signature contrôleur :', 120, y);
    doc.line(14, y + 16, 80, y + 16);
    doc.line(120, y + 16, 186, y + 16);

    doc.save(`pv-inventaire-${inv.reference ?? inv.id ?? 'stock'}.pdf`);
  }

  // ─── Bon de commande prévisionnel ─────────────────────────────────────────

  genererBonCommande(bon: BonCommandePrevisionnel): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BON DE COMMANDE PRÉVISIONNEL', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date : ${this.formatDate(bon.date)}`, 14, 28);
    doc.text(`Fournisseur : ${bon.fournisseur ?? 'Multi-fournisseurs'}`, 14, 34);

    autoTable(doc, {
      startY: 42,
      head: [['Code', 'Produit', 'Quantité', 'Unité', 'P.U. (FCFA)', 'Montant (FCFA)']],
      body: bon.lignes.map(l => [
        l.produitCode,
        l.produitLibelle,
        this.fmtNombre(l.quantite),
        LIBELLES_UNITE[l.unite],
        this.fmtNombre(l.prixUnitaire),
        this.fmtNombre(l.montant),
      ]),
      foot: [['', '', '', '', 'Total', `${this.fmtNombre(bon.montantTotal)} ${DEVISE}`]],
      headStyles: { fillColor: BLEU, textColor: 255 },
      footStyles: { fillColor: [238, 242, 255], textColor: 30, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    });

    doc.save(`bon-commande-previsionnel-${this.dateFichier()}.pdf`);
  }

  // ─── Synthèse mensuelle ───────────────────────────────────────────────────

  genererSynthese(synthese: SyntheseMensuelle): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SYNTHÈSE MENSUELLE DES STOCKS', pageWidth / 2, 16, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Mois : ${synthese.mois}`, 14, 26);
    doc.text(`Site : ${synthese.siteNom ?? 'Tous sites'}`, 90, 26);

    autoTable(doc, {
      startY: 32,
      head: [['Code', 'Produit', 'Unité', 'Stock initial', 'Entrées', 'Sorties', 'Stock final', 'Valeur (FCFA)']],
      body: synthese.lignes.map(l => [
        l.produitCode,
        l.produitLibelle,
        LIBELLES_UNITE[l.unite],
        this.fmtNombre(l.stockInitial),
        this.fmtNombre(l.entrees),
        this.fmtNombre(l.sorties),
        this.fmtNombre(l.stockFinal),
        this.fmtNombre(l.valeurFinale),
      ]),
      foot: [[
        '', '', 'Totaux',
        '', this.fmtNombre(synthese.totalEntrees), this.fmtNombre(synthese.totalSorties),
        '', `${this.fmtNombre(synthese.valeurStockFinal)}`,
      ]],
      headStyles: { fillColor: BLEU, textColor: 255 },
      footStyles: { fillColor: [238, 242, 255], textColor: 30, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
        6: { halign: 'right' }, 7: { halign: 'right' },
      },
    });

    doc.save(`synthese-stock-${synthese.mois}.pdf`);
  }

  // ─── Tableau de bord ──────────────────────────────────────────────────────

  genererTableauBord(rapport: RapportTableauBordStock, filtres: FiltreTableauBordStock): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TABLEAU DE BORD DES STOCKS', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Période : ${this.formatDate(filtres.dateDebut)} → ${this.formatDate(filtres.dateFin)}`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Valeur totale du stock', `${this.fmtNombre(rapport.kpis.valeurTotale)} ${DEVISE}`],
        ['Nombre de produits', this.fmtNombre(rapport.kpis.nbProduits)],
        ['Produits en rupture', this.fmtNombre(rapport.kpis.nbRupture)],
        ['Produits en alerte', this.fmtNombre(rapport.kpis.nbAlerte)],
        ['Taux de rotation moyen', rapport.kpis.tauxRotationMoyen.toFixed(2)],
        ['Produits dormants', this.fmtNombre(rapport.kpis.nbDormants)],
      ],
      headStyles: { fillColor: BLEU, textColor: 255 },
      styles: { fontSize: 10 },
    });

    let y = this.finalY(doc) + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Top consommations', 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [['Produit', 'Quantité']],
      body: rapport.topConsommations.map(c => [c.produitLibelle, `${this.fmtNombre(c.quantite)} ${LIBELLES_UNITE[c.unite]}`]),
      headStyles: { fillColor: BLEU, textColor: 255 },
      styles: { fontSize: 9 },
    });

    doc.save(`tableau-bord-stocks-${this.dateFichier()}.pdf`);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private finalY(doc: jsPDF): number {
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  private fmtNombre(n: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
  }

  private fmtQte(n: number, unite?: string): string {
    const u = unite ? ` ${LIBELLES_UNITE[unite as keyof typeof LIBELLES_UNITE] ?? unite}` : '';
    return `${this.fmtNombre(n)}${u}`;
  }

  private formatDate(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const jj = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${jj}/${mm}/${d.getFullYear()}`;
  }

  private dateFichier(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
}
