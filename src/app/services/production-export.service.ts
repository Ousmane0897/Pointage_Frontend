import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  RapportTableauBord,
} from '../models/production-tableau-bord.model';

/**
 * Exports Excel et PDF du rapport du Tableau de Bord Production —
 * Module Production Chimie (5.1).
 */
@Injectable({ providedIn: 'root' })
export class ProductionExportService {

  exporterRapportExcel(rapport: RapportTableauBord): void {
    const wb = XLSX.utils.book_new();

    // KPI
    const kpiRows = [
      { Indicateur: 'Volume produit (L)', Valeur: rapport.kpi.volumeProduit },
      { Indicateur: 'OF terminés', Valeur: rapport.kpi.nbOfTermines },
      { Indicateur: 'OF annulés', Valeur: rapport.kpi.nbOfAnnules },
      { Indicateur: 'Taux de réussite CQ (%)', Valeur: (rapport.kpi.tauxReussiteCq * 100).toFixed(1) },
      { Indicateur: 'Taux de perte moyen (%)', Valeur: (rapport.kpi.tauxPerteMoyen * 100).toFixed(1) },
      { Indicateur: 'Lots validés', Valeur: rapport.kpi.nbLotsValides },
      { Indicateur: 'Lots rejetés', Valeur: rapport.kpi.nbLotsRejetes },
      { Indicateur: 'Lots en stock', Valeur: rapport.kpi.nbLotsEnStock },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), 'KPI');

    // Volumes par produit
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rapport.volumesParProduit.map((v) => ({
          Produit: v.produitNom,
          'Volume total': v.volumeTotal,
          'OF terminés': v.nbOfTermines,
        })),
      ),
      'Volumes par produit',
    );

    // Évolution mensuelle
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rapport.evolutionMensuelle.map((e) => ({ Mois: e.mois, Volume: e.volume, 'Nb OF': e.nbOf })),
      ),
      'Évolution mensuelle',
    );

    // Rendements
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rapport.rendements.map((r) => ({
          Produit: r.produitNom,
          'Théorique (L)': r.rendementTheorique,
          'Réel (L)': r.rendementReel,
          'Écart (%)': r.ecart.toFixed(2),
        })),
      ),
      'Rendements',
    );

    XLSX.writeFile(wb, `rapport-production-${rapport.filtre.dateDebut}_${rapport.filtre.dateFin}.xlsx`);
  }

  exporterRapportPdf(rapport: RapportTableauBord): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPPORT DE PRODUCTION', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Période : ${this.formatDate(rapport.filtre.dateDebut)} → ${this.formatDate(rapport.filtre.dateFin)}`,
      pageWidth / 2,
      26,
      { align: 'center' },
    );

    // KPI
    autoTable(doc, {
      startY: 36,
      head: [['Indicateur clé', 'Valeur']],
      body: [
        ['Volume produit', `${rapport.kpi.volumeProduit.toLocaleString('fr-FR')} L`],
        ['OF terminés', `${rapport.kpi.nbOfTermines}`],
        ['OF annulés', `${rapport.kpi.nbOfAnnules}`],
        ['Taux réussite CQ', `${(rapport.kpi.tauxReussiteCq * 100).toFixed(1)} %`],
        ['Taux de perte moyen', `${(rapport.kpi.tauxPerteMoyen * 100).toFixed(1)} %`],
        ['Lots validés / rejetés / en stock', `${rapport.kpi.nbLotsValides} / ${rapport.kpi.nbLotsRejetes} / ${rapport.kpi.nbLotsEnStock}`],
      ],
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9 },
    });

    const finKpi = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

    // Volumes par produit
    autoTable(doc, {
      startY: finKpi + 8,
      head: [['Produit', 'Volume total (L)', 'OF terminés']],
      body: rapport.volumesParProduit.map((v) => [
        v.produitNom,
        v.volumeTotal.toLocaleString('fr-FR'),
        String(v.nbOfTermines),
      ]),
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9 },
    });

    const finVol = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

    // Rendements
    autoTable(doc, {
      startY: finVol + 8,
      head: [['Produit', 'Théorique', 'Réel', 'Écart']],
      body: rapport.rendements.map((r) => [
        r.produitNom,
        `${r.rendementTheorique.toLocaleString('fr-FR')} L`,
        `${r.rendementReel.toLocaleString('fr-FR')} L`,
        `${r.ecart >= 0 ? '+' : ''}${r.ecart.toFixed(2)} %`,
      ]),
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9 },
    });

    doc.save(`rapport-production-${rapport.filtre.dateDebut}_${rapport.filtre.dateFin}.pdf`);
  }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    const j = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${j}/${m}/${d.getFullYear()}`;
  }
}
