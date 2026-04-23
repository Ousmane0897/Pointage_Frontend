import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BulletinPaie, LigneBulletin } from '../models/bulletin-paie.model';

/**
 * Génération des bulletins de paie au format PDF (jsPDF + autoTable).
 * Modèle conforme aux standards sénégalais : entête entreprise + employé,
 * corps en 3 blocs (gains, retenues, cotisations patronales),
 * pied avec net à payer et cumuls.
 */
@Injectable({ providedIn: 'root' })
export class BulletinPdfService {

  /**
   * Configuration de l'entreprise. À terme, ces valeurs viendront
   * d'un service `ParametresEntrepriseService`. Pour l'instant, defaults.
   */
  private parametresEntreprise = {
    raisonSociale: 'CLEANIC SENEGAL',
    adresse: 'Dakar, Sénégal',
    ninea: '—',
    rccm: '—',
    numeroIpres: '—',
    numeroCss: '—',
  };

  genererBulletin(bulletin: BulletinPaie): jsPDF {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // ─── Entête : société & employé ─────────────────────────────────────────
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(this.parametresEntreprise.raisonSociale, 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(this.parametresEntreprise.adresse, 14, 22);
    doc.text(`NINEA : ${this.parametresEntreprise.ninea}`, 14, 27);
    doc.text(`RCCM : ${this.parametresEntreprise.rccm}`, 14, 32);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BULLETIN DE PAIE', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${this.nomMois(bulletin.periode.mois)} ${bulletin.periode.annee}`,
      pageWidth / 2, 27, { align: 'center' },
    );

    // Bloc employé
    const startY = 42;
    doc.setDrawColor(200);
    doc.line(14, startY, pageWidth - 14, startY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Employé', 14, startY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Matricule : ${bulletin.matricule}`, 14, startY + 12);
    doc.text(`Nom & prénom : ${bulletin.nom} ${bulletin.prenom}`, 14, startY + 17);
    doc.text(`Poste : ${bulletin.poste ?? '—'}`, 14, startY + 22);
    doc.text(`Département : ${bulletin.departement ?? '—'}`, 14, startY + 27);

    doc.setFont('helvetica', 'bold');
    doc.text('Références sociales', pageWidth / 2, startY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° IPRES : ${bulletin.numeroIpres ?? '—'}`, pageWidth / 2, startY + 12);
    doc.text(`N° CSS : ${bulletin.numeroCss ?? '—'}`, pageWidth / 2, startY + 17);
    doc.text(`Banque : ${bulletin.banque ?? '—'}`, pageWidth / 2, startY + 22);
    doc.text(`RIB : ${bulletin.rib ?? '—'}`, pageWidth / 2, startY + 27);

    // ─── Corps : tableau des lignes ─────────────────────────────────────────
    autoTable(doc, {
      startY: startY + 34,
      head: [['Libellé', 'Base', 'Taux', 'Part salariale', 'Part patronale']],
      body: bulletin.lignes.map(l => [
        l.libelle,
        l.base !== undefined ? this.formatFCFA(l.base) : '',
        l.taux !== undefined ? (l.taux * 100).toFixed(2) + ' %' : '',
        this.formatMontantLigne(l, 'salarial'),
        this.formatMontantLigne(l, 'patronal'),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    // ─── Pied : totaux & net à payer ────────────────────────────────────────
    const finY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Salaire brut : ${this.formatFCFA(bulletin.salaireBrut)}`, 14, finY);
    doc.text(`Total retenues salariales : ${this.formatFCFA(bulletin.totalCotisationsSalariales)}`, 14, finY + 6);
    let ligneY = finY + 12;
    const retenuesPerso = bulletin.totalRetenuesPersonnelles ?? 0;
    if (retenuesPerso > 0) {
      doc.text(
        `Total prêts, avances & retenues : ${this.formatFCFA(retenuesPerso)}`,
        14, ligneY,
      );
      ligneY += 6;
    }
    doc.text(`Total cotisations patronales : ${this.formatFCFA(bulletin.totalCotisationsPatronales)}`, 14, ligneY);
    doc.text(`Coût total employeur : ${this.formatFCFA(bulletin.coutTotalEmployeur)}`, 14, ligneY + 6);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(30, 64, 175);
    doc.setTextColor(255);
    doc.rect(pageWidth - 80, finY, 66, 12, 'F');
    doc.text(
      `NET À PAYER : ${this.formatFCFA(bulletin.netAPayer)}`,
      pageWidth - 77, finY + 8,
    );
    doc.setTextColor(0);

    // Cumuls annuels (si dispo) — décalés sous la dernière ligne de totaux
    const cumulsY = ligneY + 18;
    if (bulletin.cumulBrutAnnuel !== undefined) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Cumul brut annuel : ${this.formatFCFA(bulletin.cumulBrutAnnuel)}   •   ` +
        `Cumul net annuel : ${this.formatFCFA(bulletin.cumulNetAnnuel ?? 0)}   •   ` +
        `Solde congés : ${bulletin.soldeConges ?? 0} j`,
        14, cumulsY,
      );
    }

    // Date d'édition
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(
      `Édité le ${new Date().toLocaleDateString('fr-FR')} — Document à conserver`,
      pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' },
    );

    return doc;
  }

  /** Télécharge directement le bulletin. */
  telechargerBulletin(bulletin: BulletinPaie): void {
    const doc = this.genererBulletin(bulletin);
    const nomFichier = `bulletin-${bulletin.matricule}-${bulletin.periode.annee}-${String(bulletin.periode.mois).padStart(2, '0')}.pdf`;
    doc.save(nomFichier);
  }

  /** Ouvre le bulletin dans une fenêtre dédiée pour impression. */
  imprimerBulletin(bulletin: BulletinPaie): void {
    const doc = this.genererBulletin(bulletin);
    doc.autoPrint();
    const url = doc.output('bloburl');
    window.open(url, '_blank');
  }

  /** Retourne l'URL blob pour un aperçu iframe. */
  apercuBulletin(bulletin: BulletinPaie): string {
    const doc = this.genererBulletin(bulletin);
    return doc.output('bloburl').toString();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private formatMontantLigne(l: LigneBulletin, type: 'salarial' | 'patronal'): string {
    const montant = type === 'salarial' ? l.montantSalarial : l.montantPatronal;
    if (montant === undefined || montant === 0) return '';
    return this.formatFCFA(montant);
  }

  private formatFCFA(montant: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(montant)) + ' FCFA';
  }

  private nomMois(mois: number): string {
    const noms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    return noms[(mois - 1 + 12) % 12] ?? '';
  }
}
