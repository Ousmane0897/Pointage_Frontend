import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Pointage } from '../models/pointage.model';
import { libelleAgence, libelleAnomaliePointage } from '../constants/pointage.constants';

/** Période exportée, en `yyyy-MM-dd` (telle qu'envoyée au serveur). */
export interface PeriodeExportPointage {
  dateDebut: string;
  dateFin: string;
}

const ENTETES = [
  'Date', 'Code', 'Agent', 'Arrivée', 'Départ', 'Durée',
  'Agence (arrivée)', 'Agence (départ)', 'Anomalies',
];

/**
 * Exports de l'historique des pointages kiosque — 100 % client (XLSX + jsPDF).
 *
 * Les deux colonnes d'agence sont **toujours** présentes et indépendantes : un agent
 * peut arriver dans une agence et repartir d'une autre, ce n'est pas une anomalie.
 */
@Injectable({ providedIn: 'root' })
export class PointageExportService {

  exporterExcel(pointages: Pointage[], periode: PeriodeExportPointage): void {
    const lignes = pointages.map((p) => this.ligne(p));
    const ws = XLSX.utils.aoa_to_sheet([ENTETES, ...lignes]);
    ws['!cols'] = [12, 8, 26, 9, 9, 10, 24, 24, 30].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pointages');
    XLSX.writeFile(wb, `historique-pointages-${periode.dateDebut}_${periode.dateFin}.xlsx`);
  }

  exporterPdf(pointages: Pointage[], periode: PeriodeExportPointage): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTORIQUE DES POINTAGES', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Période : ${formaterDate(periode.dateDebut)} → ${formaterDate(periode.dateFin)} · ${pointages.length} pointage(s)`,
      pageWidth / 2, 22, { align: 'center' },
    );

    autoTable(doc, {
      startY: 28,
      head: [ENTETES],
      body: pointages.map((p) => this.ligne(p)),
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: { 8: { cellWidth: 45 } },
    });

    doc.save(`historique-pointages-${periode.dateDebut}_${periode.dateFin}.pdf`);
  }

  private ligne(p: Pointage): string[] {
    return [
      formaterDate(p.date),
      p.codeSecret ?? '',
      `${p.prenom ?? ''} ${p.nom ?? ''}`.trim(),
      p.heureArrive ?? '',
      p.heureDepart ?? '',
      p.duree ?? '',
      libelleAgence(p.agenceArriveeNom),
      // Départ pas encore pointé : rien à attribuer, ce n'est pas une agence manquante.
      p.heureDepart ? libelleAgence(p.agenceDepartNom) : '',
      (p.anomalies ?? []).map(libelleAnomaliePointage).join(', '),
    ];
  }
}

/** `yyyy-MM-dd` → `dd/MM/yyyy`, sans passer par `Date` (aucun décalage de fuseau). */
export function formaterDate(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '');
}
