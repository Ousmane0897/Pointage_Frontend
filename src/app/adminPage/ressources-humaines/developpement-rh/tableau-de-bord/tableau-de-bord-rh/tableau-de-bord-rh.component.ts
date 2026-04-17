import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartData, ChartOptions } from 'chart.js';
import { Subject, of, catchError, finalize, takeUntil, forkJoin } from 'rxjs';

import { TableauBordRhService } from '../../../../../services/tableau-bord-rh.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import { KpiRh, FiltreTableauBord, RepartitionItem } from '../../../../../models/tableau-bord-rh.model';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';

@Component({
  selector: 'app-tableau-de-bord-rh',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, BaseChartDirective, KpiCardComponent],
  templateUrl: './tableau-de-bord-rh.component.html',
  styleUrl: './tableau-de-bord-rh.component.scss',
})
export class TableauDeBordRhComponent implements OnInit, OnDestroy {

  kpis: KpiRh | null = null;
  loading = false;

  filtres: FiltreTableauBord = {
    dateDebut: '',
    dateFin: '',
    departement: '',
    site: '',
  };

  departements: string[] = [];
  sites: string[] = [];

  // Charts
  deptChartData!: ChartData<'doughnut'>;
  deptChartOptions: ChartOptions<'doughnut'> = { responsive: true, plugins: { legend: { position: 'bottom' } } };

  contratChartData!: ChartData<'doughnut'>;
  contratChartOptions: ChartOptions<'doughnut'> = { responsive: true, plugins: { legend: { position: 'bottom' } } };

  sanctionTypeChartData!: ChartData<'bar'>;
  sanctionTypeChartOptions: ChartOptions<'bar'> = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } };

  sanctionPeriodeChartData!: ChartData<'bar'>;
  sanctionPeriodeChartOptions: ChartOptions<'bar'> = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } };

  private readonly colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

  private destroy$ = new Subject<void>();

  constructor(
    private tableauBordService: TableauBordRhService,
    private dossierService: DossierEmployeService,
    private toastr: ToastrService,
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadReferenceData();
    this.loadKpis();
  }

  private loadReferenceData(): void {
    forkJoin({
      departements: this.dossierService.getDepartements().pipe(catchError(() => of([]))),
      sites: this.dossierService.getSites().pipe(catchError(() => of([]))),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(res => {
      this.departements = res.departements;
      this.sites = res.sites;
    });
  }

  loadKpis(): void {
    this.loading = true;
    const f: FiltreTableauBord = {
      dateDebut: this.filtres.dateDebut || undefined,
      dateFin: this.filtres.dateFin || undefined,
      departement: this.filtres.departement || undefined,
      site: this.filtres.site || undefined,
    };

    this.tableauBordService.getKpis(f).pipe(
      catchError(err => {
        console.error(err);
        if (err?.status === 0) this.toastr.error('Serveur injoignable.', 'Erreur réseau');
        else this.toastr.error('Impossible de charger le tableau de bord.', 'Erreur');
        return of(null);
      }),
      finalize(() => (this.loading = false)),
      takeUntil(this.destroy$),
    ).subscribe(kpis => {
      if (!kpis) return;
      this.kpis = kpis;
      this.buildCharts(kpis);
    });
  }

  applyFilters(): void { this.loadKpis(); }
  resetFilters(): void {
    this.filtres = { dateDebut: '', dateFin: '', departement: '', site: '' };
    this.loadKpis();
  }

  exportPdf(): void {
    if (this.kpis) this.tableauBordService.exportPdf(this.kpis, this.filtres);
  }

  exportExcel(): void {
    if (this.kpis) this.tableauBordService.exportExcel(this.kpis, this.filtres);
  }

  // ─── Formatage ──────────────────────────────────────────────────────────

  formatFcfa(montant: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(montant) + ' FCFA';
  }

  formatPct(value: number): string {
    return value.toFixed(1) + ' %';
  }

  formatMin(value: number): string {
    return value.toFixed(0) + ' min';
  }

  // ─── Charts ─────────────────────────────────────────────────────────────

  private buildCharts(kpis: KpiRh): void {
    this.deptChartData = this.buildDoughnutData(kpis.repartitionDepartement);
    this.contratChartData = this.buildDoughnutData(kpis.repartitionTypeContrat);
    this.sanctionTypeChartData = this.buildBarData(kpis.sanctionsParType, '#EF4444');
    this.sanctionPeriodeChartData = this.buildBarData(kpis.sanctionsParPeriode, '#F59E0B');
  }

  private buildDoughnutData(items: RepartitionItem[]): ChartData<'doughnut'> {
    return {
      labels: items.map(i => i.label),
      datasets: [{
        data: items.map(i => i.value),
        backgroundColor: this.colors.slice(0, items.length),
      }],
    };
  }

  private buildBarData(items: RepartitionItem[], color: string): ChartData<'bar'> {
    return {
      labels: items.map(i => i.label),
      datasets: [{
        data: items.map(i => i.value),
        backgroundColor: color,
        borderRadius: 4,
      }],
    };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
