import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  RapportTableauBord,
} from '../models/production-tableau-bord.model';

@Injectable({ providedIn: 'root' })
export class ProductionExportService {

  exporterRapportExcel(rapport: RapportTableauBord): void {
    const wb = XLSX.utils.book_new();

    const kpiRows = [
      { Indicateur: 'Volume produit (L)', Valeur: rapport.kpis.volumeProduitLitres },
      { Indicateur: 'OF terminés', Valeur: rapport.kpis.nbOfTermines },
      { Indicateur: 'OF annulés', Valeur: rapport.kpis.nbOfAnnules },
      { Indicateur: 'Taux de réussite CQ (%)', Valeur: (rapport.kpis.tauxReussiteCq * 100).toFixed(1) },
      { Indicateur: 'Taux de perte moyen (%)', Valeur: (rapport.kpis.tauxPerteMoyen * 100).toFixed(1) },
      { Indicateur: 'Lots validés', Valeur: rapport.kpis.nbLotsValide },
      { Indicateur: 'Lots rejetés', Valeur: rapport.kpis.nbLotsRejete },
      { Indicateur: 'Lots en attente CQ', Valeur: rapport.kpis.nbLotsEnAttenteControle },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), 'KPI');

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rapport.volumesParProduit.map((v) => ({
          Produit: v.produitNom,
          'Volume (L)': v.volumeLitres,
          'Nb lots': v.nbLots,
        })),
      ),
      'Volumes par produit',
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rapport.evolutionMensuelle.map((e) => ({ Mois: e.mois, 'Volume (L)': e.volumeLitres, 'Nb lots': e.nbLots })),
      ),
      'Évolution mensuelle',
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rapport.rendements.map((r) => ({
          Produit: r.produitNom,
          'Théorique': r.sommeQuantiteTheorique,
          'Réel': r.sommeQuantiteReelle,
          'Écart (%)': r.ecartPourcent.toFixed(2),
        })),
      ),
      'Rendements',
    );

    XLSX.writeFile(wb, `rapport-production-${rapport.kpis.dateDebut}_${rapport.kpis.dateFin}.xlsx`);
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
      `Période : ${this.formatDate(rapport.kpis.dateDebut)} → ${this.formatDate(rapport.kpis.dateFin)}`,
      pageWidth / 2,
      26,
      { align: 'center' },
    );

    autoTable(doc, {
      startY: 36,
      head: [['Indicateur clé', 'Valeur']],
      body: [
        ['Volume produit', `${rapport.kpis.volumeProduitLitres.toLocaleString('fr-FR')} L`],
        ['OF terminés', `${rapport.kpis.nbOfTermines}`],
        ['OF annulés', `${rapport.kpis.nbOfAnnules}`],
        ['Taux réussite CQ', `${(rapport.kpis.tauxReussiteCq * 100).toFixed(1)} %`],
        ['Taux de perte moyen', `${(rapport.kpis.tauxPerteMoyen * 100).toFixed(1)} %`],
        ['Lots validés / rejetés / en attente CQ', `${rapport.kpis.nbLotsValide} / ${rapport.kpis.nbLotsRejete} / ${rapport.kpis.nbLotsEnAttenteControle}`],
      ],
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9 },
    });

    const finKpi = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

    autoTable(doc, {
      startY: finKpi + 8,
      head: [['Produit', 'Volume (L)', 'Nb lots']],
      body: rapport.volumesParProduit.map((v) => [
        v.produitNom,
        v.volumeLitres.toLocaleString('fr-FR'),
        String(v.nbLots),
      ]),
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9 },
    });

    const finVol = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

    autoTable(doc, {
      startY: finVol + 8,
      head: [['Produit', 'Théorique', 'Réel', 'Écart']],
      body: rapport.rendements.map((r) => [
        r.produitNom,
        `${r.sommeQuantiteTheorique.toLocaleString('fr-FR')} L`,
        `${r.sommeQuantiteReelle.toLocaleString('fr-FR')} L`,
        `${r.ecartPourcent >= 0 ? '+' : ''}${r.ecartPourcent.toFixed(2)} %`,
      ]),
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9 },
    });

    doc.save(`rapport-production-${rapport.kpis.dateDebut}_${rapport.kpis.dateFin}.pdf`);
  }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    const j = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${j}/${m}/${d.getFullYear()}`;
  }
}
