import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, forkJoin, takeUntil } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartConfiguration } from 'chart.js';

import { EvaluationService } from '../../../../../services/evaluation.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import {
  EvaluationPeriodique,
  StatutEvaluation,
  LIBELLES_STATUT_EVALUATION,
} from '../../../../../models/evaluation.model';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';

Chart.register(...registerables);

@Component({
  selector: 'app-historique-employe',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, BaseChartDirective],
  templateUrl: './historique-employe.component.html',
  styleUrl: './historique-employe.component.scss',
})
export class HistoriqueEmployeComponent implements OnInit, OnDestroy {

  employe: DossierEmploye | null = null;
  evaluations: EvaluationPeriodique[] = [];
  loading = false;

  // Chart
  chartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Note : ${ctx.parsed.y?.toFixed(2)} / 5`,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 5,
        ticks: { stepSize: 1 },
        title: { display: true, text: 'Note globale' },
      },
      x: {
        title: { display: true, text: 'Période' },
      },
    },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private evaluationService: EvaluationService,
    private dossierService: DossierEmployeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    const employeId = this.route.snapshot.paramMap.get('employeId');
    if (employeId) this.loadData(employeId);
  }

  private loadData(employeId: string): void {
    this.loading = true;
    forkJoin({
      employe: this.dossierService.getEmployeById(employeId).pipe(
        catchError(() => of(null)),
      ),
      evaluations: this.evaluationService.getHistoriqueEmploye(employeId).pipe(
        catchError(() => of([] as EvaluationPeriodique[])),
      ),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(res => {
      this.loading = false;
      this.employe = res.employe;
      this.evaluations = res.evaluations.sort((a, b) =>
        (a.periode ?? '').localeCompare(b.periode ?? ''),
      );
      this.buildChart();
    });
  }

  private buildChart(): void {
    const evalsWithNote = this.evaluations.filter(e => e.noteGlobale != null);
    this.chartData = {
      labels: evalsWithNote.map(e => e.periode),
      datasets: [
        {
          data: evalsWithNote.map(e => e.noteGlobale!),
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#4f46e5',
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };
  }

  voirEvaluation(id: string): void {
    this.router.navigate(['/admin/rh/developpement-rh/evaluations', id]);
  }

  retour(): void {
    this.router.navigate(['/admin/rh/developpement-rh/evaluations']);
  }

  getStatutLabel(s: StatutEvaluation): string {
    return LIBELLES_STATUT_EVALUATION[s] ?? s;
  }

  getStatutClasses(s: StatutEvaluation): string {
    const map: Record<StatutEvaluation, string> = {
      BROUILLON: 'bg-gray-100 text-gray-600 border border-gray-200',
      AUTO_EVALUATION: 'bg-blue-100 text-blue-700 border border-blue-200',
      EVALUATION_MANAGER: 'bg-amber-100 text-amber-700 border border-amber-200',
      VALIDE: 'bg-green-100 text-green-700 border border-green-200',
    };
    return map[s];
  }

  getNoteColor(note: number | undefined): string {
    if (note == null) return 'text-gray-400';
    if (note >= 4) return 'text-green-600';
    if (note >= 3) return 'text-blue-600';
    if (note >= 2) return 'text-amber-600';
    return 'text-red-600';
  }

  get moyenneGlobale(): number | null {
    const notees = this.evaluations.filter(e => e.noteGlobale != null);
    if (notees.length === 0) return null;
    return notees.reduce((s, e) => s + e.noteGlobale!, 0) / notees.length;
  }

  get tendance(): 'hausse' | 'baisse' | 'stable' | null {
    const notees = this.evaluations.filter(e => e.noteGlobale != null);
    if (notees.length < 2) return null;
    const last = notees[notees.length - 1].noteGlobale!;
    const prev = notees[notees.length - 2].noteGlobale!;
    if (last > prev + 0.1) return 'hausse';
    if (last < prev - 0.1) return 'baisse';
    return 'stable';
  }

  trackById(_: number, e: EvaluationPeriodique): string {
    return e.id ?? `${e.employeId}-${e.periode}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
