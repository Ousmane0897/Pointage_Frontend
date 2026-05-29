import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FicheIntervention } from '../models/terrain-intervention.model';
import { ApplicationPhyto } from '../models/terrain-phytosanitaire.model';
import { RapportTableauBordTerrain } from '../models/terrain-tableau-bord.model';

/**
 * Service de génération PDF — Module Exploitation Terrain (5.2).
 *
 * Gère :
 * - Fiches d'intervention (archivage / envoi client)
 * - Registre phytosanitaire (conformité réglementaire)
 * - Tableau de bord de pilotage (rapport périodique)
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

  // ─── Tableau de bord ────────────────────────────────────────────────────

  exporterTableauBordPdf(rapport: RapportTableauBordTerrain): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const k = rapport.kpis;

    // En-tête
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('TABLEAU DE BORD EXPLOITATION TERRAIN', pageWidth / 2, 16, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Période : ${this.formatDate(k.dateDebut)} → ${this.formatDate(k.dateFin)}`,
      pageWidth / 2,
      24,
      { align: 'center' },
    );

    // Bloc KPIs
    autoTable(doc, {
      startY: 32,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Taux de couverture', `${(k.tauxCouverture * 100).toFixed(1)} %`],
        ['Interventions réalisées', `${k.nbInterventionsRealisees} / ${k.nbAffectationsPlanifiees}`],
        ['Satisfaction moyenne', `${k.satisfactionMoyenne.toFixed(2)} / 5`],
        ['Nb d\'incidents', String(k.nbIncidents)],
        ['Agents actifs', String(k.nbAgentsActifs)],
        ['Sites actifs', String(k.nbSitesActifs)],
        [
          'Contrôles qualité',
          `${k.nbControlesConformes} conformes / ${k.nbControles}`,
        ],
        ['Alertes escaladées', String(k.nbAlertesEscaladees)],
      ],
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      styles: { fontSize: 10 },
    });

    let cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

    // Bloc Interventions par site
    if (rapport.interventionsParSite.length > 0) {
      autoTable(doc, {
        startY: cursorY + 8,
        head: [['Site', 'Code', 'Réalisées', 'Prévues', 'Couverture']],
        body: rapport.interventionsParSite.map((s) => [
          s.siteNom,
          s.siteCode,
          s.nbInterventions.toString(),
          s.nbPrevues.toString(),
          `${(s.tauxCouverture * 100).toFixed(0)} %`,
        ]),
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        styles: { fontSize: 9 },
      });
      cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    }

    // Bloc Incidents par site
    if (rapport.incidentsParSite.length > 0) {
      autoTable(doc, {
        startY: cursorY + 8,
        head: [['Site', 'Nb incidents', 'Retards', 'Absences', 'Hors zone', 'Départs préma.']],
        body: rapport.incidentsParSite.map((i) => [
          i.siteNom,
          i.nbIncidents.toString(),
          String(i.parType['RETARD'] ?? 0),
          String(i.parType['ABSENCE'] ?? 0),
          String(i.parType['HORS_ZONE'] ?? i.parType['POINTAGE_HORS_ZONE'] ?? 0),
          String(i.parType['DEPART_PREMATURE'] ?? 0),
        ]),
        headStyles: { fillColor: [239, 68, 68], textColor: 255 },
        styles: { fontSize: 9 },
      });
      cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    }

    // Bloc Comparaison N vs N-1
    if (rapport.comparaison) {
      const c = rapport.comparaison;
      autoTable(doc, {
        startY: cursorY + 8,
        head: [['Comparaison N vs N-1', 'Évolution']],
        body: [
          ['Δ Taux de couverture', `${c.deltaCouverturePoints >= 0 ? '+' : ''}${c.deltaCouverturePoints.toFixed(1)} pts`],
          ['Δ Interventions', `${c.deltaInterventionsPourcent >= 0 ? '+' : ''}${c.deltaInterventionsPourcent.toFixed(1)} %`],
          ['Δ Satisfaction', `${c.deltaSatisfactionPoints >= 0 ? '+' : ''}${c.deltaSatisfactionPoints.toFixed(2)} pts`],
          ['Δ Incidents', `${c.deltaIncidentsPourcent >= 0 ? '+' : ''}${c.deltaIncidentsPourcent.toFixed(1)} %`],
        ],
        headStyles: { fillColor: [55, 65, 81], textColor: 255 },
        styles: { fontSize: 10 },
      });
    }

    doc.save(`tableau-bord-terrain-${k.dateDebut}_${k.dateFin}.pdf`);
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
