import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { environment } from '../../environments/environment';
import {
  RecapitulatifMensuel,
  FiltreRecap,
} from '../models/recapitulatif-mensuel.model';

/**
 * Service d'agrégation du récapitulatif mensuel (jours travaillés, absences,
 * retards, heures supplémentaires) et d'export Excel / PDF.
 * Ces données alimentent le module Paie (6.3).
 */
@Injectable({ providedIn: 'root' })
export class RecapitulatifMensuelService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Récupère le récapitulatif mensuel agrégé pour une période donnée.
   */
  genererRecap(filtre: FiltreRecap): Observable<RecapitulatifMensuel[]> {
    let params = new HttpParams()
      .set('mois', filtre.mois)
      .set('annee', filtre.annee);

    if (filtre.departement) params = params.set('departement', filtre.departement);
    if (filtre.site) params = params.set('site', filtre.site);
    if (filtre.q) params = params.set('q', filtre.q);

    return this.http.get<RecapitulatifMensuel[]>(
      `${this.baseUrl}/temps-presences/recapitulatif`,
      { params },
    );
  }

  // ─── Export Excel ─────────────────────────────────────────────────────────
  exportExcel(recaps: RecapitulatifMensuel[], mois: number, annee: number): void {
    const nomMois = this.getNomMois(mois);
    const rows = recaps.map(r => ({
      'Matricule': r.matricule,
      'Nom': r.nom,
      'Prénom': r.prenom,
      'Département': r.departement,
      'Poste': r.poste ?? '',
      'Jours ouvrables': r.joursOuvrables,
      'Jours travaillés': r.joursTravailles,
      'Jours absence': r.joursAbsence,
      'Jours congé': r.joursConge,
      'Nb retards': r.nombreRetards,
      'Retard (min)': r.minutesRetardTotal,
      'HS total (h)': r.heuresSupTotal,
      'HS majorées équiv. (h)': r.heuresSupMajoreesEquivalent,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Récap ${nomMois} ${annee}`);
    XLSX.writeFile(wb, `recapitulatif-${nomMois.toLowerCase()}-${annee}.xlsx`);
  }

  // ─── Export PDF ───────────────────────────────────────────────────────────
  exportPdf(recaps: RecapitulatifMensuel[], mois: number, annee: number): void {
    const nomMois = this.getNomMois(mois);
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(14);
    doc.text(`Récapitulatif mensuel — ${nomMois} ${annee}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [[
        'Matricule', 'Nom', 'Prénom', 'Département',
        'J. ouvr.', 'J. trav.', 'Absences', 'Congés',
        'Retards', 'Min. retard', 'HS (h)', 'HS maj. équiv.',
      ]],
      body: recaps.map(r => [
        r.matricule,
        r.nom,
        r.prenom,
        r.departement,
        r.joursOuvrables,
        r.joursTravailles,
        r.joursAbsence,
        r.joursConge,
        r.nombreRetards,
        r.minutesRetardTotal,
        r.heuresSupTotal,
        r.heuresSupMajoreesEquivalent,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`recapitulatif-${nomMois.toLowerCase()}-${annee}.pdf`);
  }

  private getNomMois(mois: number): string {
    const noms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    return noms[(mois - 1 + 12) % 12] ?? '';
  }
}
