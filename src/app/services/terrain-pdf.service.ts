import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FicheIntervention } from '../models/terrain-intervention.model';
import { ApplicationPhyto } from '../models/terrain-phytosanitaire.model';

/**
 * Service de génération PDF — Module Exploitation Terrain (5.2).
 *
 * Gère :
 * - Fiches d'intervention (archivage / envoi client)
 * - Registre phytosanitaire (conformité réglementaire)
 */
@Injectable({ providedIn: 'root' })
export class TerrainPdfService {

  // ─── Fiche d'intervention ───────────────────────────────────────────────

  genererFicheIntervention(fiche: FicheIntervention): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FICHE D\'INTERVENTION', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Numéro : ${fiche.numero}`, 14, 28);
    doc.text(`Site : ${fiche.siteNom ?? '—'} (${fiche.siteCode ?? ''})`, 14, 34);
    doc.text(`Agent : ${fiche.employeNom ?? '—'} (${fiche.employeMatricule ?? ''})`, 14, 40);
    doc.text(
      `Date : ${this.formatDateTime(fiche.dateDebut)} → ${
        fiche.dateFin ? this.formatDateTime(fiche.dateFin) : 'en cours'
      }`,
      14,
      46,
    );

    // Tâches
    autoTable(doc, {
      startY: 56,
      head: [['Tâche', 'Faite', 'Observation']],
      body: fiche.taches.map((t) => [
        t.libelle,
        t.fait ? 'Oui' : 'Non',
        t.observation ?? '',
      ]),
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      styles: { fontSize: 9 },
    });

    let cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

    // Produits utilisés
    if (fiche.produits.length > 0) {
      autoTable(doc, {
        startY: cursorY + 8,
        head: [['Produit', 'Quantité', 'Unité', 'Référence']],
        body: fiche.produits.map((p) => [
          p.nom,
          p.quantite.toString(),
          p.unite,
          p.reference ?? '',
        ]),
        headStyles: { fillColor: [30, 64, 175], textColor: 255 },
        styles: { fontSize: 9 },
      });
      cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    }

    // Observations
    if (fiche.observations) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Observations', 14, cursorY + 10);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const lignes = doc.splitTextToSize(fiche.observations, pageWidth - 28);
      doc.text(lignes, 14, cursorY + 16);
      cursorY += 16 + lignes.length * 5;
    }

    // Signature
    if (fiche.signatureClient) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Signature du client', 14, cursorY + 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${fiche.signatureClient.nom}${
          fiche.signatureClient.fonction ? ' — ' + fiche.signatureClient.fonction : ''
        }`,
        14,
        cursorY + 18,
      );
      doc.text(`Date : ${this.formatDateTime(fiche.signatureClient.date)}`, 14, cursorY + 24);
      try {
        doc.addImage(fiche.signatureClient.dataUrl, 'PNG', 14, cursorY + 28, 60, 25);
      } catch {
        // ignore si dataUrl invalide
      }
    }

    doc.save(`fiche-intervention-${fiche.numero}.pdf`);
  }

  // ─── Registre phytosanitaire ────────────────────────────────────────────

  genererRegistrePhyto(
    applications: ApplicationPhyto[],
    dateDebut: string,
    dateFin: string,
  ): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('REGISTRE PHYTOSANITAIRE', pageWidth / 2, 16, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Période : ${this.formatDate(dateDebut)} → ${this.formatDate(dateFin)}`,
      pageWidth / 2,
      24,
      { align: 'center' },
    );

    autoTable(doc, {
      startY: 32,
      head: [[
        'Date', 'Site', 'Produit', 'N° homologation',
        'Dose', 'Zone', 'Agent', 'Statut',
      ]],
      body: applications.map((a) => [
        this.formatDate(a.dateApplication),
        a.siteNom ?? a.siteCode ?? '',
        a.produitNomCommercial ?? '',
        a.produitNumeroHomologation ?? '',
        `${a.doseAppliquee} ${a.doseUnite}`,
        a.zoneTraitee.libelle,
        a.employeNom ?? '',
        a.statut,
      ]),
      headStyles: { fillColor: [22, 163, 74], textColor: 255 },
      styles: { fontSize: 8 },
    });

    doc.save(`registre-phytosanitaire-${dateDebut}_${dateFin}.pdf`);
  }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    const j = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${j}/${m}/${d.getFullYear()}`;
  }

  private formatDateTime(iso: string): string {
    const d = new Date(iso);
    const date = this.formatDate(iso);
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${date} ${h}:${min}`;
  }
}
