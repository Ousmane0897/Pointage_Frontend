import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2ConsommationService } from '../../../../../services/stock-v2-consommation.service';
import { StockV2ExportService } from '../../../../../services/stock-v2-export.service';
import { StatistiqueCategorie } from '../../../../../models/stock-v2-consommation.model';
import { TypeEntree } from '../../../../../models/stock-v2-bon-entree.model';
import {
  LIBELLES_TYPE_ENTREE,
  DESCRIPTIONS_TYPE_ENTREE,
  COULEURS_TYPE_ENTREE,
  ORDRE_TYPES_ENTREE,
  COULEURS_CHARTS,
  DEVISE,
} from '../../../../../constants/stock.constants';

interface LigneCategorie {
  code: TypeEntree;
  libelle: string;
  description: string;
  couleur: { bg: string; text: string };
  nombre: number;
  volume: number;
  montant: number;
  pourcentage: number;
}

/**
 * Catégorisation des entrées — Module Stock v2 / 7.4 (fonctionnalité 1).
 *
 * Référentiel figé des 4 types d'entrée (lecture seule) enrichi des
 * statistiques d'usage sur la période sélectionnée. Aide à l'analyse.
 */
@Component({
  selector: 'app-categorisation-entrees',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, BaseChartDirective],
  templateUrl: './categorisation-entrees.component.html',
  styleUrl: './categorisation-entrees.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategorisationEntreesComponent implements OnInit, OnDestroy {

  lignes: LigneCategorie[] = [];
  loading = false;

  readonly DEVISE = DEVISE;

  filtres = new FormGroup({
    dateDebut: new FormControl<string>(this.dateDebutAnnee(), { nonNullable: true }),
    dateFin: new FormControl<string>(this.aujourdhui(), { nonNullable: true }),
  });

  doughnutData: ChartData<'doughnut'> | null = null;
  readonly doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right' } },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2ConsommationService,
    private exportService: StockV2ExportService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    this.loading = true;
    const { dateDebut, dateFin } = this.filtres.getRawValue();
    this.service.statistiquesCategorie('ENTREE', dateDebut || undefined, dateFin || undefined)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.lignes = this.fusionner(stats);
          this.construireChart();
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error("Impossible de charger les statistiques d'entrée."),
      });
  }

  /** Fusionne les 4 types figés avec les statistiques renvoyées (0 si absent). */
  private fusionner(stats: StatistiqueCategorie[]): LigneCategorie[] {
    const parCode = new Map(stats.map(s => [s.code, s]));
    return ORDRE_TYPES_ENTREE.map(code => {
      const s = parCode.get(code);
      return {
        code,
        libelle: LIBELLES_TYPE_ENTREE[code],
        description: DESCRIPTIONS_TYPE_ENTREE[code],
        couleur: COULEURS_TYPE_ENTREE[code],
        nombre: s?.nombre ?? 0,
        volume: s?.volume ?? 0,
        montant: s?.montant ?? 0,
        pourcentage: s?.pourcentage ?? 0,
      };
    });
  }

  private construireChart(): void {
    const actives = this.lignes.filter(l => l.volume > 0);
    if (actives.length === 0) { this.doughnutData = null; return; }
    this.doughnutData = {
      labels: actives.map(l => l.libelle),
      datasets: [{
        data: actives.map(l => l.volume),
        backgroundColor: actives.map((_, i) => COULEURS_CHARTS[i % COULEURS_CHARTS.length]),
      }],
    };
  }

  exporter(): void {
    if (this.lignes.every(l => l.nombre === 0)) {
      this.toastr.info('Aucune statistique à exporter sur cette période.');
      return;
    }
    this.exportService.exporterStatistiquesCategorie(
      this.lignes.map(l => ({
        code: l.code, libelle: l.libelle, nombre: l.nombre,
        volume: l.volume, montant: l.montant, pourcentage: l.pourcentage,
      })),
      "Catégories d'entrée",
    );
  }

  get totalNombre(): number { return this.lignes.reduce((s, l) => s + l.nombre, 0); }
  get totalVolume(): number { return this.lignes.reduce((s, l) => s + l.volume, 0); }
  get totalMontant(): number { return this.lignes.reduce((s, l) => s + l.montant, 0); }

  trackByCode(_: number, l: LigneCategorie): string { return l.code; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private dateDebutAnnee(): string {
    return `${new Date().getFullYear()}-01-01`;
  }
}
