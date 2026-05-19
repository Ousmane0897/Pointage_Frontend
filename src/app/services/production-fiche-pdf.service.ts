import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  FicheFormulation,
  IngredientFormulation,
  EtapeProcessus,
} from '../models/production-formulation.model';
import { LIBELLES_UNITE } from '../constants/production-chimie.constants';

/**
 * Génère une fiche de formulation imprimable pour l'atelier — Module
 * Production Chimie (5.1).
 *
 * Le PDF est mis en page A4 portrait, conçu pour être plastifié et apposé
 * au poste de production : entête, liste d'ingrédients, procédé étape par
 * étape avec conditions (T°, pression, durées).
 */
@Injectable({ providedIn: 'root' })
export class ProductionFichePdfService {

  private readonly entreprise = {
    raisonSociale: 'CLEANIC SENEGAL',
    adresse: 'Dakar, Sénégal',
  };

  generer(formulation: FicheFormulation): jsPDF {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ─── En-tête ────────────────────────────────────────────────────────
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(this.entreprise.raisonSociale, 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(this.entreprise.adresse, 14, 22);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FICHE DE FORMULATION', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Imprimée le ${this.formatDate(new Date())}`, pageWidth - 14, 16, { align: 'right' });

    // ─── Bloc identification produit ────────────────────────────────────
    const startY = 38;
    doc.setDrawColor(200);
    doc.line(14, startY, pageWidth - 14, startY);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(formulation.nom, 14, startY + 8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Code : ${formulation.code}`, 14, startY + 14);
    doc.text(`Version : ${formulation.versionCourante}`, 80, startY + 14);
    doc.text(
      `Durée de péremption : ${formulation.dureePeremptionJours} jours`,
      130,
      startY + 14,
    );
    if (formulation.description) {
      const description = doc.splitTextToSize(formulation.description, pageWidth - 28);
      doc.text(description, 14, startY + 20);
    }

    // ─── Tableau ingrédients ────────────────────────────────────────────
    const tableStart = startY + (formulation.description ? 30 : 22);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Ingrédients', 14, tableStart);

    autoTable(doc, {
      startY: tableStart + 4,
      head: [['#', 'Matière première', 'Dosage', 'Unité', 'Remarque']],
      body: this.lignesIngredients(formulation.ingredients),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        2: { halign: 'right', cellWidth: 28 },
        3: { halign: 'center', cellWidth: 18 },
      },
    });

    // ─── Procédé étape par étape ────────────────────────────────────────
    const finIngredients = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Procédé de fabrication', 14, finIngredients + 10);

    autoTable(doc, {
      startY: finIngredients + 14,
      head: [['Étape', 'Description', 'T° (°C)', 'Pression (bar)', 'Agitation (tr/min)', 'Durée (min)', 'Repos (min)']],
      body: this.lignesEtapes(formulation.etapes),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 14 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
    });

    // ─── Pied de page ───────────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Document interne — fiche de formulation à plastifier au poste de production.',
      14,
      pageHeight - 10,
    );

    return doc;
  }

  telecharger(formulation: FicheFormulation): void {
    const doc = this.generer(formulation);
    doc.save(`fiche-formulation-${formulation.code}-v${formulation.versionCourante}.pdf`);
  }

  imprimer(formulation: FicheFormulation): void {
    const doc = this.generer(formulation);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private lignesIngredients(ingredients: IngredientFormulation[]): string[][] {
    return [...ingredients]
      .sort((a, b) => a.ordre - b.ordre)
      .map((ing, idx) => [
        String(idx + 1),
        ing.matierePremiereNom ?? ing.matierePremiereId,
        this.formatDosage(ing.dosage),
        LIBELLES_UNITE[ing.unite],
        ing.remarque ?? '',
      ]);
  }

  private lignesEtapes(etapes: EtapeProcessus[]): string[][] {
    return [...etapes]
      .sort((a, b) => a.ordre - b.ordre)
      .map((e) => [
        String(e.ordre),
        this.libelleEtape(e),
        e.temperature != null ? String(e.temperature) : '—',
        e.pression != null ? String(e.pression) : '—',
        e.vitesseAgitation != null ? String(e.vitesseAgitation) : '—',
        e.dureeMinutes != null ? String(e.dureeMinutes) : '—',
        e.dureeReposMinutes != null ? String(e.dureeReposMinutes) : '—',
      ]);
  }

  private libelleEtape(e: EtapeProcessus): string {
    if (e.instructions && e.instructions.trim()) {
      return `${e.libelle}\n${e.instructions}`;
    }
    return e.libelle;
  }

  private formatDate(d: Date): string {
    const j = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${j}/${m}/${d.getFullYear()}`;
  }

  private formatDosage(n: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(n);
  }
}
