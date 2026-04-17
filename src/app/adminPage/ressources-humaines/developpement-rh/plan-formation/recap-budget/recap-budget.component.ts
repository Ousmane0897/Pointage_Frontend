import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, takeUntil } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartData, ChartOptions } from 'chart.js';

import { FormationService } from '../../../../../services/formation.service';
import { RecapBudgetFormation } from '../../../../../models/formation.model';

@Component({
  selector: 'app-recap-budget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, BaseChartDirective],
  templateUrl: './recap-budget.component.html',
  styleUrl: './recap-budget.component.scss',
})
export class RecapBudgetComponent implements OnInit, OnDestroy {

  annee: number = new Date().getFullYear();
  recap: RecapBudgetFormation | null = null;
  loading = false;

  // Chart
  chartData: ChartData<'bar'> = { labels: [], datasets: [] };
  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => this.formatFcfa(+value),
        },
      },
    },
  };

  private destroy$ = new Subject<void>();

  constructor(private formationService: FormationService) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadRecap();
  }

  loadRecap(): void {
    this.loading = true;
    this.formationService.getRecapBudget(this.annee).pipe(
      catchError(() => {
        return of(null);
      }),
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.loading = false;
      this.recap = data;
      if (data) this.buildChart(data);
    });
  }

  onAnneeChange(): void {
    this.loadRecap();
  }

  private buildChart(data: RecapBudgetFormation): void {
    this.chartData = {
      labels: ['Budget'],
      datasets: [
        {
          label: 'Budget prévu',
          data: [data.budgetPrevu],
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 1,
        },
        {
          label: 'Budget consommé',
          data: [data.budgetConsomme],
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 1,
        },
      ],
    };
  }

  formatFcfa(montant: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(montant) + ' FCFA';
  }

  formatPourcentage(val: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(val) + ' %';
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
