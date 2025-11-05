import { Component, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { StockService } from '../../../services/stock.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-rapports-et-statistiques',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './rapports-et-statistiques.component.html',
  styleUrls: ['./rapports-et-statistiques.component.scss'],
})
export class RapportsEtStatistiquesComponent {
  @ViewChildren(BaseChartDirective) charts!: QueryList<BaseChartDirective>;

  // === États ===
  loading = true;

  // === Données des graphiques ===
  evolutionChart!: ChartConfiguration<'line'>['data'];
  sortieChart!: ChartConfiguration<'pie'>['data'];
  topChart!: ChartConfiguration<'bar'>['data'];
  snapshotChart!: ChartConfiguration<'bar'>['data'];
  evolutionProduitsChart!: ChartConfiguration<'line'>['data'];

  // === Données temporaires ===
  produits: any[] = [];
  produitSelectionne = '';
  snapshotPeriode = '';

  // === Statistiques clés ===
  totalProduits = 0;
  totalEntreesMois = 0;
  totalSortiesMois = 0;
  variationStock = 0;
  topProduitNom = '—';
  topProduitQuantite = 0;

  // === Filtres ===
  moisSelectionne = new Date().getMonth() + 1;
  anneeSelectionnee = new Date().getFullYear();
  moisDisponibles = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  constructor(private stockService: StockService, private router: Router) { }

  ngOnInit(): void {
    this.chargerTousLesGraphes();
  }

  // ==========================================================
  // 🔄 Changement de mois/année → recharge tous les graphes
  // ==========================================================
  onPeriodeChange() {
    this.chargerTousLesGraphes();
  }

  // ==========================================================
  // 🔁 Chargement combiné (corrigé)
  // ==========================================================
  chargerTousLesGraphes() {
    this.loading = true;
    this.resetCharts(); // ✅ Réinitialise avant chaque chargement

    this.loadProduits();
    this.chargerEvolutionStock();
    this.chargerSortiesParDestination();
    this.chargerTopProduits();
    this.chargerSnapshot();
    this.chargerEvolutionProduits();

    setTimeout(() => {
      this.calculerStatistiques();
      this.loading = false;
      this.updateCharts();
    }, 1200);
  }

  // ==========================================================
  // 🧹 Réinitialisation complète
  // ==========================================================
  resetCharts() {
    this.evolutionChart = { labels: [], datasets: [] };
    this.sortieChart = { labels: [], datasets: [] };
    this.topChart = { labels: [], datasets: [] };
    this.snapshotChart = { labels: [], datasets: [] };
    this.evolutionProduitsChart = { labels: [], datasets: [] };

    this.totalEntreesMois = 0;
    this.totalSortiesMois = 0;
    this.variationStock = 0;
    this.topProduitNom = '—';
    this.topProduitQuantite = 0;

    // Supprimer graphiques du DOM s’ils existent déjà. Cela évite les conflits lors du rechargement.
    // et force la recréation des graphiques avec les nouvelles données.
    if (this.charts) {
      this.charts.forEach((chart) => {
        if (chart.chart) chart.chart.clear();
      });
    }
  }

  // ==========================================================
  // 🧩 Produits
  // ==========================================================
  loadProduits() {
    this.stockService.getProduits().subscribe((data) => {
      this.produits = data;
      this.totalProduits = data.length;
      if (this.produits.length > 0) {
        this.produitSelectionne = this.produits[0].codeProduit;
      }
    });
  }

  // ==========================================================
  // 📈 Évolution du stock (par produit)
  // ==========================================================
  chargerEvolutionStock() {
    if (!this.produitSelectionne) return;

    this.stockService.getStockEvolution(this.produitSelectionne).subscribe((res) => {
      if (!res.labels || res.labels.length === 0) {
        this.evolutionChart = { labels: [], datasets: [] }; // ✅ vide
        this.updateCharts();
        return;
      }

      this.evolutionChart = {
        labels: res.labels,
        datasets: [
          {
            data: res.data,
            label: 'Évolution du stock',
            fill: true,
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37,99,235,0.2)',
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 8,
          },
        ],
      };

      this.updateCharts();
    });
  }

  // ==========================================================
  // 🏢 Sorties par destination
  // ==========================================================
  chargerSortiesParDestination() {
    this.stockService.getSortiesParDestination(this.moisSelectionne, this.anneeSelectionnee)
      .subscribe((res) => {
        if (!res.labels || res.labels.length === 0) {
          this.sortieChart = { labels: [], datasets: [] }; // ✅ vide
          this.updateCharts();
          return;
        }

        this.sortieChart = {
          labels: res.labels,
          datasets: [
            {
              data: res.data,
              backgroundColor: [
                '#3B82F6', '#10B981', '#F59E0B',
                '#EF4444', '#8B5CF6', '#14B8A6'
              ],
              borderWidth: 1,
            },
          ],
        };
        this.updateCharts();
      });
  }

  // ==========================================================
  // 🏆 Top produits sortis (mois + année)
  // ==========================================================
  chargerTopProduits() {
    this.stockService.getTopProduitsSortis(this.moisSelectionne, this.anneeSelectionnee)
      .subscribe((res) => {
        if (!res.labels || res.labels.length === 0) {
          this.topChart = { labels: [], datasets: [] }; // ✅ vide
          this.updateCharts();
          return;
        }

        this.topChart = {
          labels: res.labels,
          datasets: [
            {
              data: res.data,
              label: 'Produits sortis',
              backgroundColor: [
                '#F87171', '#FB923C', '#FACC15',
                '#4ADE80', '#60A5FA'
              ],
            },
          ],
        };
        this.updateCharts();
      });
  }

  // ==========================================================
  // 📊 Snapshot mensuel
  // ==========================================================
  chargerSnapshot() {
    this.stockService.getSnapshotByMonth(this.moisSelectionne, this.anneeSelectionnee)
      .subscribe((res) => {
        if (!res.labels || res.labels.length === 0) {
          this.snapshotChart = { labels: [], datasets: [] }; // ✅ vide
          this.snapshotPeriode = '';
          this.updateCharts();
          return;
        }

        this.snapshotPeriode = res.periode;
        this.snapshotChart = {
          labels: res.labels,
          datasets: [
            {
              data: res.data,
              label: 'Stock net du mois',
              backgroundColor: '#3B82F6',
            },
          ],
        };
        this.updateCharts();
      });
  }

  // ==========================================================
  // 📈 Évolution multi-produits
  // ==========================================================
  chargerEvolutionProduits() {
    this.stockService.getEvolutionParProduits().subscribe((res) => {
      if (!res || !res.labels || !res.datasets || res.datasets.length === 0) {
        this.evolutionProduitsChart = { labels: [], datasets: [] };
        this.updateCharts();
        return;
      }

      const dataset = res.datasets[0]; // unique dataset reçu du backend

      this.evolutionProduitsChart = {
        labels: res.labels, // noms des produits
        datasets: [
          {
            label: dataset.label,
            data: dataset.data,
            borderColor: '#2563EB', // bleu principal
            backgroundColor: 'rgba(37,99,235,0.2)', // bleu clair transparent sous la ligne
            fill: true, // remplit légèrement sous la ligne
            tension: 0.4, // courbe douce
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#2563EB', // points bleus
            pointBorderColor: '#fff', // bord blanc pour lisibilité
          },
        ],
      };

      this.updateCharts();
    });
  }

  // ==========================================================
  // 📈 Statistiques clés (corrigé)
  // ==========================================================
  calculerStatistiques() {
    this.totalProduits = this.produits.length;

    const rawData = this.snapshotChart?.datasets?.[0]?.data ?? [];
    const allData = (rawData as (number | null | [number, number])[])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    const entrees = allData.reduce((acc, val) => acc + Math.max(0, val), 0);
    let sorties = allData.reduce((acc, val) => acc + Math.max(0, -val), 0);

    if (sorties === 0 && this.topChart?.datasets?.length) {
      const topData = (this.topChart.datasets[0].data ?? []) as (number | null)[];
      const totalSorties = topData
        .filter((v): v is number => typeof v === 'number')
        .reduce((a, b) => a + b, 0);
      sorties = totalSorties;
    }

    const variation = entrees - sorties;

    this.animateCounter('totalEntreesMois', entrees);
    this.animateCounter('totalSortiesMois', sorties);
    this.animateCounter('variationStock', variation);
    this.animateCounter('totalProduits', this.produits.length);

    if (this.topChart?.labels?.length && this.topChart.datasets[0]?.data?.length) {
      const data = (this.topChart.datasets[0].data ?? []) as (number | null)[];
      const filteredData = data.filter((v): v is number => typeof v === 'number');
      if (filteredData.length > 0) {
        const maxValue = Math.max(...filteredData);
        const maxIndex = data.indexOf(maxValue);
        this.topProduitNom = this.topChart.labels[maxIndex] as string;
        this.topProduitQuantite = maxValue;
      } else {
        this.topProduitNom = '—';
        this.topProduitQuantite = 0;
      }
    } else {
      this.topProduitNom = '—';
      this.topProduitQuantite = 0;
    }
  }

  // ==========================================================
  // ⚡ Animation fluide des statistiques (compteurs)
  // ==========================================================
  animateCounter(targetVar: keyof RapportsEtStatistiquesComponent, endValue: number, duration = 800) {
    const startValue = Number(this[targetVar]) || 0;
    const frameRate = 1000 / 60;
    const totalFrames = duration / frameRate;
    let frame = 0;

    const counter = setInterval(() => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const currentValue = Math.floor(startValue + (endValue - startValue) * this.easeOutCubic(progress));
      (this as any)[targetVar] = currentValue;

      if (progress === 1) clearInterval(counter);
    }, frameRate);
  }

  easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // ==========================================================
  // 🎨 Couleurs dynamiques
  // ==========================================================
  getColor(index: number, opacity: number = 1) {
    const colors = [
      'rgba(37,99,235,OPACITY)',
      'rgba(16,185,129,OPACITY)',
      'rgba(245,158,11,OPACITY)',
      'rgba(239,68,68,OPACITY)',
      'rgba(139,92,246,OPACITY)',
    ];
    return colors[index % colors.length].replace('OPACITY', opacity.toString());
  }

  // ==========================================================
  // 🔄 Mise à jour globale des graphiques
  // ==========================================================
  updateCharts() {
    if (this.charts) {
      setTimeout(() => {
        this.charts.forEach((chart) => chart.update());
      }, 100);
    }
  }

  // ==========================================================
  // ⚙️ Options graphiques communes
  // ==========================================================
  evolutionOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: true, text: '📈 Évolution du stock (par mois)' },
    },
    scales: { y: { beginAtZero: true } },
  };

  sortieOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: '🏢 Répartition des sorties par destination' },
    },
  };

  topOptions: ChartOptions<'bar'> = {
    responsive: true,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      title: { display: true, text: '🏆 Top 5 produits les plus sortis' },
    },
  };

  snapshotOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { title: { display: true, text: '📊 Répartition mensuelle du stock' } },
  };

  evolutionProduitsOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: '📈 Stock global — par produit' },
    },
    scales: {
      x: {
        title: { display: true, text: 'Produits' },
        ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Quantité en stock' },
      },
    },
    elements: {
      line: { tension: 0.4 },
      point: { radius: 4 },
    },
  };

}
