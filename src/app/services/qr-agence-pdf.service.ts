import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import * as QRCode from 'qrcode';
import { AgenceQr } from '../models/terrain-qr-agence.model';

/** Côté du QR imprimé (mm) : lisible à distance de bras, sur une page A4. */
const COTE_QR_MM = 150;

/**
 * Affiches A4 des QR codes de pointage des agences — une page par agence.
 *
 * La version et la date de génération sont imprimées : après une régénération, elles
 * permettent de repérer sur place une affiche périmée (son QR ne fonctionne plus).
 */
@Injectable({ providedIn: 'root' })
export class QrAgencePdfService {

  async telecharger(agences: AgenceQr[]): Promise<void> {
    const doc = await this.generer(agences);
    doc.save(agences.length === 1
      ? `qr-pointage-${slug(agences[0].code || agences[0].nom)}-v${agences[0].qrVersion ?? 1}.pdf`
      : `qr-pointage-agences.pdf`);
  }

  async imprimer(agences: AgenceQr[]): Promise<void> {
    const doc = await this.generer(agences);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }

  private async generer(agences: AgenceQr[]): Promise<jsPDF> {
    const imprimables = agences.filter((a) => !!a.url);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const largeur = doc.internal.pageSize.getWidth();
    const hauteur = doc.internal.pageSize.getHeight();

    for (let i = 0; i < imprimables.length; i++) {
      const a = imprimables[i];
      if (i > 0) {
        doc.addPage();
      }
      const qr = await QRCode.toDataURL(a.url!, { width: 1200, margin: 1, errorCorrectionLevel: 'M' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(79, 70, 229);
      doc.text('POINTAGE — CLEANIC SÉNÉGAL', largeur / 2, 22, { align: 'center' });

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(28);
      const lignesNom = doc.splitTextToSize(a.nom, largeur - 30) as string[];
      doc.text(lignesNom, largeur / 2, 38, { align: 'center' });

      const yQr = 38 + lignesNom.length * 11 + 4;
      doc.addImage(qr, 'PNG', (largeur - COTE_QR_MM) / 2, yQr, COTE_QR_MM, COTE_QR_MM);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.text('Scannez ce QR code avec votre téléphone pour pointer votre arrivée ou votre départ.',
        largeur / 2, yQr + COTE_QR_MM + 12, { align: 'center', maxWidth: largeur - 30 });

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Agence ${a.code} · QR version ${a.qrVersion ?? 1} · généré le ${formaterDateHeure(a.qrGenereLe)}`,
        largeur / 2, hauteur - 14, { align: 'center' });
      doc.text('Un QR régénéré remplace celui-ci : seule la dernière version fonctionne.',
        largeur / 2, hauteur - 9, { align: 'center' });
    }
    return doc;
  }
}

function slug(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** `yyyy-MM-ddTHH:mm…` → `dd/MM/yyyy`, sans passer par `Date` (aucun décalage de fuseau). */
export function formaterDateHeure(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}
