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
  formaterMinutes,
  minutesEnHeures,
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
  /**
   * Deux feuilles : « Par agent » (cumuls, une ligne par agent) et « Par agent et site »
   * (une ligne par couple agent × site). ⚠ Les jours travaillés de la seconde ne se
   * somment pas pour retrouver ceux de la première : un jour passé sur deux sites ne
   * compte qu'une fois pour l'agent. Minutes et retards, eux, s'additionnent.
   */
  exportExcel(recaps: RecapitulatifMensuel[], mois: number, annee: number): void {
    const nomMois = this.getNomMois(mois);
    const parAgent = recaps.map(r => ({
      'Matricule': r.matricule,
      'Nom': r.nom,
      'Prénom': r.prenom,
      'Code agent': r.agentId ?? '',
      'Code créé le': this.dateCode(r),
      'Département': r.departement,
      'Poste': r.poste ?? '',
      'Jours ouvrables': r.joursOuvrables,
      'Jours fériés': r.joursFeries ?? 0,
      'Jours travaillés': r.joursTravailles,
      'dont fériés travaillés': r.joursTravaillesFeries ?? 0,
      'Heures travaillées (h)': minutesEnHeures(r.minutesTravaillees),
      'Heures travaillées': formaterMinutes(r.minutesTravaillees ?? 0),
      'Créneaux sans départ': r.creneauxSansDepart ?? 0,
      'Jours absence': r.joursAbsence,
      'Jours repos médical': r.joursReposMedical ?? 0,
      'Jours congé': r.joursConge,
      'Nb retards': r.nombreRetards,
      'Minutes de retard': r.minutesRetardTotal,
      'Pointages hors planning': r.horsPlan ?? 0,
      'HS total (h)': r.heuresSupTotal,
      'HS majorées équiv. (h)': r.heuresSupMajoreesEquivalent,
    }));

    const parSite = recaps.flatMap(r => (r.sites ?? []).map(s => ({
      'Matricule': r.matricule,
      'Nom': r.nom,
      'Prénom': r.prenom,
      'Code agent': r.agentId ?? '',
      'Site': s.site,
      'Horaires': s.horaires ?? '',
      'Créneaux prévus': s.horsPlanning ? '' : s.creneauxPrevus,
      'Jours travaillés': s.joursTravailles,
      'Heures travaillées (h)': minutesEnHeures(s.minutesTravaillees),
      'Heures travaillées': formaterMinutes(s.minutesTravaillees),
      'Créneaux sans départ': s.creneauxSansDepart,
      'Jours absence': s.horsPlanning ? '' : s.joursAbsence,
      'Créneaux absents': s.horsPlanning ? '' : s.creneauxAbsents,
      'Nb retards': s.horsPlanning ? '' : s.nombreRetards,
      'Minutes de retard': s.horsPlanning ? '' : s.minutesRetardTotal,
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(parAgent), 'Par agent');
    // Feuille omise plutôt que vide : un onglet vide laisserait croire à un bug (backend
    // antérieur au détail par site).
    if (parSite.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(parSite), 'Par agent et site');
    }
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

    // Une ligne par agent (cumuls), suivie de ses lignes par site, indentées et grisées.
    const body: any[][] = [];
    for (const r of recaps) {
      body.push([
        r.matricule,
        `${r.prenom} ${r.nom}`,
        r.agentId ?? '',
        // « ≈ » est absent de la police standard de jsPDF : rendu illisible.
        this.dateCode(r, 'env. '),
        r.joursOuvrables,
        r.joursTravailles,
        formaterMinutes(r.minutesTravaillees ?? 0),
        r.joursAbsence,
        r.joursReposMedical ?? 0,
        r.joursConge,
        r.nombreRetards,
        r.minutesRetardTotal,
        r.heuresSupTotal,
      ]);
      for (const s of r.sites ?? []) {
        const style = { fillColor: [241, 245, 249] as [number, number, number], textColor: 90, fontSize: 7 };
        body.push([
          { content: '', styles: style },
          { content: `   ${s.site}${s.horaires ? ` (${s.horaires})` : ''}`, colSpan: 3, styles: style },
          { content: '', styles: style },
          { content: s.joursTravailles, styles: style },
          { content: formaterMinutes(s.minutesTravaillees), styles: style },
          { content: s.horsPlanning ? '' : s.joursAbsence, styles: style },
          { content: '', styles: style },
          { content: '', styles: style },
          { content: s.horsPlanning ? '' : s.nombreRetards, styles: style },
          { content: s.horsPlanning ? '' : s.minutesRetardTotal, styles: style },
          { content: '', styles: style },
        ]);
      }
    }

    autoTable(doc, {
      startY: 28,
      head: [[
        'Matricule', 'Employé / site', 'Code', 'Code créé le',
        'J. ouvr.', 'J. trav.', 'Heures trav.', 'Absences', 'Repos méd.', 'Congés',
        'Nb retards', 'Min. retard', 'HS (h)',
      ]],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    });

    doc.setFontSize(7);
    doc.text(
      'Heures : créneaux dont le départ a été pointé. Les jours travaillés par site ne s\'additionnent pas '
      + '(un jour sur deux sites compte une fois). env. : date de code approximative.',
      14, (doc as any).lastAutoTable.finalY + 6,
    );

    doc.save(`recapitulatif-${nomMois.toLowerCase()}-${annee}.pdf`);
  }

  /** « 02/03/2025 », préfixé (« ≈ ») quand la date est reconstituée. */
  private dateCode(r: RecapitulatifMensuel, prefixeEstimee = '≈ '): string {
    if (!r.dateCreationAgentId) return '';
    // Lecture de la partie date de la chaîne ISO : `new Date()` décalerait selon le fuseau.
    const [a, m, j] = r.dateCreationAgentId.slice(0, 10).split('-');
    return `${r.dateCreationAgentIdEstimee ? prefixeEstimee : ''}${j}/${m}/${a}`;
  }

  private getNomMois(mois: number): string {
    const noms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    return noms[(mois - 1 + 12) % 12] ?? '';
  }
}
