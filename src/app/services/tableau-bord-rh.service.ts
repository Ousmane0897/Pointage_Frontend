import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { environment } from '../../environments/environment';
import { KpiRh, FiltreTableauBord, RepartitionItem } from '../models/tableau-bord-rh.model';

/**
 * Service du Tableau de Bord RH – Développement RH.
 * Agrège les KPIs de l'ensemble du module RH (6.1 à 6.4)
 * via un endpoint unique d'agrégation backend.
 * Fournit l'export PDF et Excel côté client.
 */
@Injectable({ providedIn: 'root' })
export class TableauBordRhService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── Récupération des KPIs ──────────────────────────────────────

  getKpis(filtres?: FiltreTableauBord): Observable<KpiRh> {
    let params = new HttpParams();

    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.departement) params = params.set('departement', filtres.departement);
    if (filtres?.site) params = params.set('site', filtres.site);

    return this.http.get<KpiRh>(
      `${this.baseUrl}/developpement-rh/tableau-bord`,
      { params },
    );
  }

  // ─── Export PDF ─────────────────────────────────────────────────

  exportPdf(kpis: KpiRh, filtres?: FiltreTableauBord): void {
    const pdf = new jsPDF();
    const titre = 'Tableau de Bord RH';
    const date = new Date().toLocaleDateString('fr-FR');

    pdf.setFontSize(16);
    pdf.text(titre, 14, 20);
    pdf.setFontSize(10);
    pdf.text(`Généré le ${date}`, 14, 28);

    if (filtres?.departement || filtres?.site) {
      const filtreTxt = [
        filtres.departement ? `Département : ${filtres.departement}` : '',
        filtres.site ? `Site : ${filtres.site}` : '',
      ].filter(Boolean).join(' | ');
      pdf.text(filtreTxt, 14, 34);
    }

    // Indicateurs clés
    const kpiRows = [
      ['Effectif total', String(kpis.effectifTotal)],
      ['Turnover', `${kpis.turnover.toFixed(1)} %`],
      ['Taux d\'absentéisme', `${kpis.tauxAbsenteisme.toFixed(1)} %`],
      ['Retards moyens', `${kpis.retardsMoyensMinutes.toFixed(0)} min`],
      ['Solde congés moyen', `${kpis.soldeCongesMoyen.toFixed(1)} j`],
      ['Masse salariale mensuelle', this.formatFcfa(kpis.masseSalarialeMensuelle)],
      ['Masse salariale annuelle', this.formatFcfa(kpis.masseSalarialeAnnuelle)],
      ['Coût moyen / employé', this.formatFcfa(kpis.coutMoyenParEmploye)],
      ['Formations réalisées', String(kpis.formationsRealisees)],
      ['Taux participation formation', `${kpis.tauxParticipationFormation.toFixed(1)} %`],
    ];

    autoTable(pdf, {
      startY: 42,
      head: [['Indicateur', 'Valeur']],
      body: kpiRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Répartitions
    const addRepartition = (titre: string, items: RepartitionItem[]) => {
      const y = (pdf as any).lastAutoTable?.finalY + 10 || 42;
      autoTable(pdf, {
        startY: y,
        head: [[titre, 'Nombre']],
        body: items.map(i => [i.label, String(i.value)]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
      });
    };

    addRepartition('Répartition par département', kpis.repartitionDepartement);
    addRepartition('Répartition par type de contrat', kpis.repartitionTypeContrat);
    addRepartition('Sanctions par type', kpis.sanctionsParType);

    pdf.save(`tableau-bord-rh_${date.replace(/\//g, '-')}.pdf`);
  }

  // ─── Export Excel ───────────────────────────────────────────────

  exportExcel(kpis: KpiRh, filtres?: FiltreTableauBord): void {
    const wb = XLSX.utils.book_new();

    // Feuille KPIs
    const kpiData = [
      { Indicateur: 'Effectif total', Valeur: kpis.effectifTotal },
      { Indicateur: 'Turnover (%)', Valeur: kpis.turnover },
      { Indicateur: 'Taux absentéisme (%)', Valeur: kpis.tauxAbsenteisme },
      { Indicateur: 'Retards moyens (min)', Valeur: kpis.retardsMoyensMinutes },
      { Indicateur: 'Solde congés moyen (j)', Valeur: kpis.soldeCongesMoyen },
      { Indicateur: 'Masse salariale mensuelle (FCFA)', Valeur: kpis.masseSalarialeMensuelle },
      { Indicateur: 'Masse salariale annuelle (FCFA)', Valeur: kpis.masseSalarialeAnnuelle },
      { Indicateur: 'Coût moyen / employé (FCFA)', Valeur: kpis.coutMoyenParEmploye },
      { Indicateur: 'Formations réalisées', Valeur: kpis.formationsRealisees },
      { Indicateur: 'Taux participation formation (%)', Valeur: kpis.tauxParticipationFormation },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiData), 'KPIs');

    // Feuille Répartitions
    const repartData = [
      ...kpis.repartitionDepartement.map(r => ({ Catégorie: 'Département', Label: r.label, Valeur: r.value })),
      ...kpis.repartitionSite.map(r => ({ Catégorie: 'Site', Label: r.label, Valeur: r.value })),
      ...kpis.repartitionTypeContrat.map(r => ({ Catégorie: 'Type contrat', Label: r.label, Valeur: r.value })),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(repartData), 'Répartitions');

    // Feuille Sanctions
    const sanctionData = [
      ...kpis.sanctionsParType.map(s => ({ Catégorie: 'Par type', Label: s.label, Valeur: s.value })),
      ...kpis.sanctionsParPeriode.map(s => ({ Catégorie: 'Par période', Label: s.label, Valeur: s.value })),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanctionData), 'Sanctions');

    const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    XLSX.writeFile(wb, `tableau-bord-rh_${date}.xlsx`);
  }

  // ─── Utilitaire ─────────────────────────────────────────────────

  private formatFcfa(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(montant) + ' FCFA';
  }
}
