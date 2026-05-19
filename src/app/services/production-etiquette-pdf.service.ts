import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import * as QRCode from 'qrcode';

import { Lot } from '../models/production-lot.model';
import { FormatConditionnement } from '../models/production-format-conditionnement.model';
import { LIBELLES_UNITE } from '../constants/production-chimie.constants';

/**
 * Génération d'étiquettes PDF imprimables avec QR code — Module Production
 * Chimie (5.1).
 *
 * Le QR code encode l'URL de traçabilité publique du lot. Une étiquette =
 * une vignette ; le PDF peut contenir N vignettes (impression en lot).
 *
 * Format d'étiquette : 70 × 50 mm (compatible planches Avery type L7159).
 * 4 étiquettes par ligne, 5 lignes par page A4.
 */
@Injectable({ providedIn: 'root' })
export class ProductionEtiquettePdfService {

  private readonly entreprise = {
    raisonSociale: 'CLEANIC SENEGAL',
  };

  /** Largeur d'une étiquette en mm. */
  private readonly ETIQ_W = 70;
  /** Hauteur d'une étiquette en mm. */
  private readonly ETIQ_H = 50;
  /** Marge supérieure de la page. */
  private readonly MARGIN_TOP = 10;
  /** Marge gauche de la page. */
  private readonly MARGIN_LEFT = 10;
  /** Espacement horizontal entre étiquettes. */
  private readonly GAP_X = 5;
  /** Espacement vertical entre étiquettes. */
  private readonly GAP_Y = 5;

  /**
   * Génère un PDF contenant `nbEtiquettes` instances de l'étiquette du lot.
   * `formatNom` est le libellé du conditionnement à afficher (optionnel).
   */
  async generer(lot: Lot, nbEtiquettes: number, format?: FormatConditionnement): Promise<jsPDF> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const qrDataUrl = await this.genererQrDataUrl(this.urlTracabilite(lot));

    for (let i = 0; i < nbEtiquettes; i++) {
      if (i > 0 && i % 20 === 0) doc.addPage();
      const indexDansPage = i % 20;
      const col = indexDansPage % 4;
      const row = Math.floor(indexDansPage / 4);
      const x = this.MARGIN_LEFT + col * (this.ETIQ_W + this.GAP_X);
      const y = this.MARGIN_TOP + row * (this.ETIQ_H + this.GAP_Y);
      this.dessinerEtiquette(doc, x, y, lot, qrDataUrl, format);
    }
    return doc;
  }

  async telecharger(lot: Lot, nb: number, format?: FormatConditionnement): Promise<void> {
    const doc = await this.generer(lot, nb, format);
    doc.save(`etiquettes-${lot.numero}-x${nb}.pdf`);
  }

  async imprimer(lot: Lot, nb: number, format?: FormatConditionnement): Promise<void> {
    const doc = await this.generer(lot, nb, format);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }

  /** URL publique de traçabilité encodée dans le QR. */
  urlTracabilite(lot: Lot): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/admin/exploitation-v2/production-chimie/lots/${lot.id}/tracabilite`;
  }

  private async genererQrDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      width: 200,
      margin: 0,
      errorCorrectionLevel: 'M',
    });
  }

  private dessinerEtiquette(
    doc: jsPDF,
    x: number,
    y: number,
    lot: Lot,
    qrDataUrl: string,
    format?: FormatConditionnement,
  ): void {
    // ─── Cadre ────────────────────────────────────────────────────────
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, this.ETIQ_W, this.ETIQ_H, 2, 2);

    // ─── En-tête société ──────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(this.entreprise.raisonSociale, x + 3, y + 4);

    // ─── Nom du produit ───────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const nomLignes = doc.splitTextToSize(lot.produitNom, this.ETIQ_W - 22);
    doc.text(nomLignes, x + 3, y + 11);

    // ─── Informations ─────────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    let yInfo = y + 22;
    doc.text(`Lot : ${lot.numero}`, x + 3, yInfo);
    yInfo += 4;
    doc.text(
      `Quantité : ${this.formatNombre(lot.quantiteProduite)} ${LIBELLES_UNITE[lot.uniteProduite]}`,
      x + 3,
      yInfo,
    );
    if (format) {
      yInfo += 4;
      doc.text(`Format : ${format.libelle}`, x + 3, yInfo);
    }
    yInfo += 4;
    doc.text(`Fab. : ${this.formatDate(lot.dateFabrication)}`, x + 3, yInfo);
    yInfo += 4;
    doc.text(`Péremption : ${this.formatDate(lot.datePeremption)}`, x + 3, yInfo);

    // ─── QR code ──────────────────────────────────────────────────────
    const qrSize = 18;
    const qrX = x + this.ETIQ_W - qrSize - 3;
    const qrY = y + 5;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.text('scanner', qrX + 1, qrY + qrSize + 3);
  }

  private formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const j = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${j}/${m}/${d.getFullYear()}`;
  }

  private formatNombre(n: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
  }
}
