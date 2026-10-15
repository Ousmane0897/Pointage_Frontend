import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { RecapitulatifMensuelService } from '../../../../services/recapitulatif-mensuel.service';
import {
  RecapitulatifMensuel,
  RecapSite,
  FiltreRecap,
  formaterMinutes,
} from '../../../../models/recapitulatif-mensuel.model';

@Component({
  selector: 'app-recapitulatif-mensuel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './recapitulatif-mensuel.component.html',
  styleUrl: './recapitulatif-mensuel.component.scss',
})
export class RecapitulatifMensuelComponent implements OnInit, OnDestroy {

  recaps: RecapitulatifMensuel[] = [];
  loading = false;
  loaded = false;

  filtres: FiltreRecap = {
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    departement: '',
    site: '',
    q: '',
  };

  mois = [
    { v: 1,  l: 'Janvier' },  { v: 2,  l: 'Février' },
    { v: 3,  l: 'Mars' },     { v: 4,  l: 'Avril' },
    { v: 5,  l: 'Mai' },      { v: 6,  l: 'Juin' },
    { v: 7,  l: 'Juillet' },  { v: 8,  l: 'Août' },
    { v: 9,  l: 'Septembre' },{ v: 10, l: 'Octobre' },
    { v: 11, l: 'Novembre' }, { v: 12, l: 'Décembre' },
  ];

  annees: number[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private recapService: RecapitulatifMensuelService,
    private toastr: ToastrService,
  ) {
    const currentYear = new Date().getFullYear();
    this.annees = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }

  ngOnInit(): void {
    this.generer();
  }

  generer(): void {
    this.loading = true;
    const f: FiltreRecap = {
      mois: this.filtres.mois,
      annee: this.filtres.annee,
      departement: this.filtres.departement || undefined,
      site: this.filtres.site || undefined,
      q: this.filtres.q || undefined,
    };
    this.recapService.genererRecap(f).pipe(
      catchError(err => { this.handleError(err); return of([] as RecapitulatifMensuel[]); }),
      finalize(() => { this.loading = false; this.loaded = true; }),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      this.recaps = res;
      this.ouverts.clear();
      this.calculerTotaux();
    });
  }

  // ─── Détail par site (lignes dépliables) ─────────────────────────────────

  /** Agents dont le détail par site est déplié. */
  readonly ouverts = new Set<string>();

  readonly formaterMinutes = formaterMinutes;

  aDesSites(r: RecapitulatifMensuel): boolean {
    return (r.sites?.length ?? 0) > 0;
  }

  basculer(r: RecapitulatifMensuel): void {
    if (!this.aDesSites(r)) return;
    if (this.ouverts.has(r.employeId)) this.ouverts.delete(r.employeId);
    else this.ouverts.add(r.employeId);
  }

  get toutDeplie(): boolean {
    const avecSites = this.recaps.filter(r => this.aDesSites(r));
    return avecSites.length > 0 && avecSites.every(r => this.ouverts.has(r.employeId));
  }

  basculerTout(): void {
    if (this.toutDeplie) {
      this.ouverts.clear();
    } else {
      this.recaps.filter(r => this.aDesSites(r)).forEach(r => this.ouverts.add(r.employeId));
    }
  }

  trackBySite(_: number, s: RecapSite): string { return s.site; }

  exporterExcel(): void {
    if (this.recaps.length === 0) {
      this.toastr.info('Aucune donnée à exporter.', 'Export');
      return;
    }
    this.recapService.exportExcel(this.recaps, this.filtres.mois, this.filtres.annee);
    this.toastr.success('Export Excel généré.', 'Succès');
  }

  exporterPdf(): void {
    if (this.recaps.length === 0) {
      this.toastr.info('Aucune donnée à exporter.', 'Export');
      return;
    }
    this.recapService.exportPdf(this.recaps, this.filtres.mois, this.filtres.annee);
    this.toastr.success('Export PDF généré.', 'Succès');
  }

  // ─── Totaux agrégés ──────────────────────────────────────────────────────
  // Matérialisés au chargement plutôt que recalculés par des getters à chaque cycle.
  totalEffectif = 0;
  /**
   * Dénominateur des jours travaillés, qui n'était affiché nulle part en agrégé.
   * ⚠ Les jours ouvrables **diffèrent d'un employé à l'autre** (rythme du site, jour de
   * repos, fériés) : c'est une somme, jamais « le nombre de jours ouvrables du mois ».
   */
  totalJoursOuvrables = 0;
  totalJoursTravailles = 0;
  totalMinutesTravaillees = 0;
  totalCreneauxSansDepart = 0;
  totalAbsences = 0;
  totalReposMedical = 0;
  totalRetards = 0;
  totalHS = 0;

  private calculerTotaux(): void {
    const somme = (f: (r: RecapitulatifMensuel) => number | undefined) =>
      this.recaps.reduce((s, r) => s + (f(r) || 0), 0);
    this.totalEffectif = this.recaps.length;
    this.totalJoursOuvrables = somme(r => r.joursOuvrables);
    this.totalJoursTravailles = somme(r => r.joursTravailles);
    this.totalMinutesTravaillees = somme(r => r.minutesTravaillees);
    this.totalCreneauxSansDepart = somme(r => r.creneauxSansDepart);
    this.totalAbsences = somme(r => r.joursAbsence);
    this.totalReposMedical = somme(r => r.joursReposMedical);
    this.totalRetards = somme(r => r.nombreRetards);
    this.totalHS = somme(r => r.heuresSupTotal);
  }

  trackById(_: number, r: RecapitulatifMensuel): string { return r.employeId; }

  private handleError(err: any): void {
    console.error(err);
    if (err?.status === 0) this.toastr.error('Serveur injoignable.', 'Erreur réseau');
    else this.toastr.error('Une erreur est survenue.', 'Erreur');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
