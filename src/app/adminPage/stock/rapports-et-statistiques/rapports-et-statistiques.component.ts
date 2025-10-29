import { Component } from '@angular/core';
import { StockService } from '../../../services/stock.service';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rapports-et-statistiques',
  standalone: true,
  imports: [NgChartsModule, CommonModule],
  templateUrl: './rapports-et-statistiques.component.html',
  styleUrl: './rapports-et-statistiques.component.scss'
})
export class RapportsEtStatistiquesComponent {

   // === Données ===
  loading = true;

  // 🔹 Graphique 1 : Évolution du stock
  evolutionLabels: string[] = [];
  evolutionData: number[] = [];

  // 🔹 Graphique 2 : Répartition des sorties
  sortieLabels: string[] = [];
  sortieData: number[] = [];

  // 🔹 Graphique 3 : Top produits
  topLabels: string[] = [];
  topData: number[] = [];

  // === Sélecteurs ===
  moisSelectionne = new Date().getMonth() + 1;
  anneeSelectionnee = new Date().getFullYear();
  moisDisponibles = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  constructor(private stockService: StockService) {}

  ngOnInit(): void {
    this.chargerTousLesGraphes();
  }

  // 🔹 Chargement combiné des graphes
  chargerTousLesGraphes() {
    this.loading = true;
    this.chargerEvolutionStock();
    this.chargerSortiesParDestination();
    this.chargerTopProduits();
  }

  // ===================== API CALLS =====================

  chargerEvolutionStock() {
    this.stockService.getStockEvolution('PROD-001').subscribe((res) => {
      this.evolutionLabels = res.labels;
      this.evolutionData = res.data;
      this.loading = false;
    });
  }

  chargerSortiesParDestination() {
    this.stockService.getSortiesParDestination().subscribe((res) => {
      this.sortieLabels = res.labels;
      this.sortieData = res.data;
    });
  }

  chargerTopProduits() {
    this.stockService.getTopProduitsSortis(this.moisSelectionne, this.anneeSelectionnee)
      .subscribe((res) => {
        this.topLabels = res.labels;
        this.topData = res.data;
      });
  }

  // ===================== CONFIG GRAPHIQUES =====================

  evolutionChart: ChartConfiguration<'line'>['data'] = {
    labels: this.evolutionLabels,
    datasets: [
      {
        data: this.evolutionData,
        label: 'Évolution du stock',
        fill: true,
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
      },
    ],
  };

  evolutionOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: { display: true, labels: { color: '#1E3A8A' } },
      title: { display: true, text: '📈 Évolution du stock (par mois)' },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  sortieChart: ChartConfiguration<'pie'>['data'] = {
    labels: this.sortieLabels,
    datasets: [
      {
        data: this.sortieData,
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#14B8A6',
        ],
        borderWidth: 1,
      },
    ],
  };

  sortieOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: '🏢 Répartition des sorties par destination' },
    },
  };

  topChart: ChartConfiguration<'bar'>['data'] = {
    labels: this.topLabels,
    datasets: [
      {
        data: this.topData,
        label: 'Produits sortis',
        backgroundColor: [
          '#F87171',
          '#FB923C',
          '#FACC15',
          '#4ADE80',
          '#60A5FA',
        ],
      },
    ],
  };

  topOptions: ChartOptions<'bar'> = {
    responsive: true,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      title: { display: true, text: '🏆 Top 5 produits les plus sortis' },
    },
  }

}
