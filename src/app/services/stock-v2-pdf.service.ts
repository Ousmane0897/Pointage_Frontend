import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Inventaire } from '../models/stock-v2-inventaire.model';
import { BonCommandePrevisionnel } from '../models/stock-v2-approvisionnement.model';
import { SyntheseMensuelle } from '../models/stock-v2-synthese.model';
import { RapportTableauBordStock, FiltreTableauBordStock } from '../models/stock-v2-tableau-bord.model';
import { BonEntree } from '../models/stock-v2-bon-entree.model';
import { BonSortie } from '../models/stock-v2-bon-sortie.model';
import { ComparatifDotation } from '../models/stock-v2-dotation.model';
import { ConsommationDestinataire, RapportConsommation } from '../models/stock-v2-consommation.model';
import {
  LIBELLES_STATUT_INVENTAIRE,
  LIBELLES_UNITE,
  DEVISE,
  LIBELLES_TYPE_ENTREE,
  LIBELLES_TYPE_SORTIE,
  LIBELLES_STATUT_BON,
  LIBELLES_TYPE_DESTINATAIRE,
  LIBELLES_SENS_ECART_DOTATION,
} from '../constants/stock.constants';
import { Destinataire } from '../models/stock-v2-bon-sortie.model';

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

  // ─── Bon d'entrée numérique (7.4) ─────────────────────────────────────────

  genererBonEntree(bon: BonEntree): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("BON D'ENTRÉE", pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(11);
    doc.text(bon.reference ?? '—', pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date : ${this.formatDate(bon.date)}`, 14, 36);
    doc.text(`Type : ${LIBELLES_TYPE_ENTREE[bon.type]}`, 14, 42);
    doc.text(`Site destination : ${bon.siteDestinationNom ?? '—'}`, 14, 48);
    doc.text(`Statut : ${LIBELLES_STATUT_BON[bon.statut]}`, 120, 36);
    doc.text(`Fournisseur / source : ${bon.fournisseur ?? '—'}`, 120, 42);
    doc.text(`Réf. commande : ${bon.referenceCommande ?? '—'}`, 120, 48);

    this.tableauLignesBon(doc, 56, bon.lignes, bon.montantTotal);
    this.piedBon(doc, bon.demandeurNom, bon.validateurNom, bon.commentaire);

    doc.save(`bon-entree-${bon.reference ?? bon.id ?? this.dateFichier()}.pdf`);
  }

  // ─── Bon de sortie numérique (7.4) ────────────────────────────────────────

  genererBonSortie(bon: BonSortie): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BON DE SORTIE', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(11);
    doc.text(bon.reference ?? '—', pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date : ${this.formatDate(bon.date)}`, 14, 36);
    doc.text(`Type : ${LIBELLES_TYPE_SORTIE[bon.type]}`, 14, 42);
    doc.text(`Site source : ${bon.siteSourceNom ?? '—'}`, 14, 48);
    doc.text(`Statut : ${LIBELLES_STATUT_BON[bon.statut]}`, 120, 36);
    doc.text(`Destinataire : ${this.libelleDestinataire(bon.destinataire)}`, 120, 42);
    doc.text(`Motif : ${bon.motif ?? '—'}`, 120, 48);

    this.tableauLignesBon(doc, 56, bon.lignes, bon.montantTotal);
    this.piedBon(doc, bon.demandeurNom, bon.validateurNom, bon.commentaire);

    doc.save(`bon-sortie-${bon.reference ?? bon.id ?? this.dateFichier()}.pdf`);
  }

  // ─── Rapport de consommation (7.4 — fonctionnalité 9) ─────────────────────

  genererRapportConsommation(rapport: RapportConsommation): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPPORT DE CONSOMMATION', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Période : ${this.formatDate(rapport.dateDebut)} → ${this.formatDate(rapport.dateFin)}`, 14, 28);
    if (rapport.siteNom) doc.text(`Site : ${rapport.siteNom}`, 120, 28);
    if (rapport.produitLibelle) doc.text(`Produit : ${rapport.produitLibelle}`, 120, 34);

    autoTable(doc, {
      startY: 40,
      head: [['Libellé', 'Quantité', 'Mouvements', 'Montant (FCFA)']],
      body: rapport.lignes.map(l => [
        l.libelle,
        this.fmtNombre(l.quantite),
        this.fmtNombre(l.nbMouvements),
        this.fmtNombre(l.montant),
      ]),
      foot: [[
        'Total',
        this.fmtNombre(rapport.quantiteTotale),
        this.fmtNombre(rapport.nbMouvementsTotal),
        `${this.fmtNombre(rapport.montantTotal)} ${DEVISE}`,
      ]],
      headStyles: { fillColor: BLEU, textColor: 255 },
      footStyles: { fillColor: [238, 242, 255], textColor: 30, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    });

    let y = this.finalY(doc) + 10;
    doc.setFontSize(10);
    doc.text(`Coût moyen par mouvement : ${this.fmtNombre(rapport.coutMoyenParMouvement)} ${DEVISE}`, 14, y);

    doc.save(`rapport-consommation-${this.dateFichier()}.pdf`);
  }

  // ─── Comparatif dotation prévue vs réelle (7.4 — fonctionnalité 8) ────────

  genererComparatifDotation(comparatif: ComparatifDotation): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DOTATION PRÉVUE VS RÉELLE', pageWidth / 2, 16, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Mois : ${comparatif.mois}`, 14, 26);

    autoTable(doc, {
      startY: 32,
      head: [['Site', 'Produit', 'Prévu', 'Réel', 'Écart', 'Écart %', 'Statut']],
      body: comparatif.lignes.map(l => [
        l.siteNom ?? '',
        l.produitLibelle ?? l.produitId,
        this.fmtNombre(l.prevu),
        this.fmtNombre(l.reel),
        this.fmtNombre(l.ecart),
        `${this.fmtNombre(l.pourcentageEcart)} %`,
        LIBELLES_SENS_ECART_DOTATION[l.sens],
      ]),
      foot: [[
        'Totaux', '',
        this.fmtNombre(comparatif.totalPrevu),
        this.fmtNombre(comparatif.totalReel),
        '', '', '',
      ]],
      headStyles: { fillColor: BLEU, textColor: 255 },
      footStyles: { fillColor: [238, 242, 255], textColor: 30, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    });

    doc.save(`dotation-prevue-reelle-${comparatif.mois}.pdf`);
  }

  // ─── Historique de consommation par destinataire (7.4 — fonctionnalité 6) ─

  genererHistoriqueDestinataire(
    consommations: ConsommationDestinataire[],
    periode?: { dateDebut?: string; dateFin?: string },
  ): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSOMMATION PAR DESTINATAIRE', pageWidth / 2, 18, { align: 'center' });

    if (periode?.dateDebut || periode?.dateFin) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Période : ${this.formatDate(periode.dateDebut)} → ${this.formatDate(periode.dateFin)}`, 14, 28);
    }

    autoTable(doc, {
      startY: 34,
      head: [['Destinataire', 'Type', 'Sorties', 'Quantité', 'Montant (FCFA)']],
      body: consommations.map(c => [
        c.destinataireNom,
        c.typeDestinataire,
        this.fmtNombre(c.nbSorties),
        this.fmtNombre(c.quantiteTotale),
        this.fmtNombre(c.montantTotal),
      ]),
      headStyles: { fillColor: BLEU, textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    });

    doc.save(`consommation-destinataires-${this.dateFichier()}.pdf`);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private tableauLignesBon(
    doc: jsPDF,
    startY: number,
    lignes: { produitCode?: string; produitLibelle?: string; produitId?: string; quantite: number; unite?: string; prixUnitaire?: number; montant?: number }[],
    montantTotal?: number,
  ): void {
    autoTable(doc, {
      startY,
      head: [['Code', 'Produit', 'Quantité', 'Unité', 'P.U. (FCFA)', 'Montant (FCFA)']],
      body: lignes.map(l => [
        l.produitCode ?? '',
        l.produitLibelle ?? l.produitId ?? '',
        this.fmtNombre(l.quantite),
        l.unite ? (LIBELLES_UNITE[l.unite as keyof typeof LIBELLES_UNITE] ?? l.unite) : '',
        l.prixUnitaire == null ? '—' : this.fmtNombre(l.prixUnitaire),
        l.montant == null ? '—' : this.fmtNombre(l.montant),
      ]),
      foot: montantTotal == null ? undefined : [['', '', '', '', 'Total', `${this.fmtNombre(montantTotal)} ${DEVISE}`]],
      headStyles: { fillColor: BLEU, textColor: 255 },
      footStyles: { fillColor: [238, 242, 255], textColor: 30, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    });
  }

  private piedBon(doc: jsPDF, demandeur?: string, validateur?: string, commentaire?: string): void {
    let y = this.finalY(doc) + 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (commentaire) {
      doc.text(`Commentaire : ${commentaire}`, 14, y);
      y += 10;
    }
    doc.text(`Demandeur : ${demandeur ?? '—'}`, 14, y);
    doc.text(`Validateur : ${validateur ?? '—'}`, 120, y);
    doc.line(14, y + 16, 80, y + 16);
    doc.line(120, y + 16, 186, y + 16);
  }

  private libelleDestinataire(d: Destinataire): string {
    const type = LIBELLES_TYPE_DESTINATAIRE[d.type];
    const nom = d.siteNom ?? d.agentNom ?? d.clientNom ?? '—';
    return `${nom} (${type})`;
  }

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
