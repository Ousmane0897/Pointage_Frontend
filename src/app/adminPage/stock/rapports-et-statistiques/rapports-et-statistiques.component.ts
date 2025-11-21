import { Component, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { StockService } from '../../../services/stock.service';
import { Router } from '@angular/router';
import { AgencesService } from '../../../services/agences.service';
import { ToastrService } from 'ngx-toastr';
import { get } from 'http';
import { Produit } from '../../../models/produit.model';

@Component({
  selector: 'app-rapports-et-statistiques',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './rapports-et-statistiques.component.html',
  styleUrls: ['./rapports-et-statistiques.component.scss'],
})
export class RapportsEtStatistiquesComponent {
  @ViewChildren(BaseChartDirective) charts!: QueryList<BaseChartDirective>;

  // === Gestion des requêtes en cours ===
  pendingRequests = 0;

  // === États ===
  loading = true;

  // Méthode pour indiquer la fin d'une requête
  onRequestComplete() {
    this.pendingRequests--;
    if (this.pendingRequests === 0) {
      this.loading = false;
    }
  }


  // === Données des graphiques ===

  sortieChart!: ChartConfiguration<'pie'>['data'];
  sortieBarChart!: ChartConfiguration<'bar'>['data'];
  produitDestinationChart!: ChartConfiguration<'line'>['data'];
  consommationDestinationChart!: ChartConfiguration<'bar'>['data'];
  classementDestinationChart!: ChartConfiguration<'bar'>['data'];
  consommationProduitPeriodeChart!: ChartConfiguration<'bar'>['data'];





  // === Données temporaires ===
  produits: Produit[] = [];
  produitSelectionne = '';
  snapshotPeriode = '';
  destinations: string[] = [];


  // === Filtres ===
  moisSelectionne = new Date().getUTCMonth() + 1;
  anneeSelectionnee = new Date().getFullYear();
  destinationSelectionnee = '';
  moisDisponibles = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  moisDebutSelectionne = 1;
  moisFinSelectionne = new Date().getUTCMonth() + 1; // Mois courant par défaut


  constructor(private stockService: StockService,
    private router: Router,
    private agencesService: AgencesService, private toastr: ToastrService) { }

  ngOnInit(): void {
    this.chargerTousLesGraphes();
    this.getAvailableAgences();
    this.loadProduits();
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

    this.pendingRequests = 3; // Nombre total de requêtes à effectuer

    this.chargerSortiesParDestination();
    this.chargerProduitDestination();
    this.chargerConsommationDestination();
    this.chargerSortiesParDestinationBar();
    this.chargerClassementDestinationsProduit();  
    this.chargerConsommationProduitParPeriode();



  }

  // ==========================================================
  // 🧹 Réinitialisation complète
  // ==========================================================
  resetCharts() {
    // Réinitialise les données des graphiques à vide après chaque chargement de nouveaux filtres
    this.sortieChart = { labels: [], datasets: [] };
    this.produitDestinationChart = { labels: [], datasets: [] };
    this.consommationDestinationChart = { labels: [], datasets: [] };

    // Supprimer graphiques du DOM s’ils existent déjà. Cela évite les conflits lors du rechargement.
    // et force la recréation des graphiques avec les nouvelles données.
    if (this.charts) {
      this.charts.forEach((chart) => {
        if (chart.chart) chart.chart.clear();
      });
    }
  }

  getAvailableAgences() {
    this.agencesService.getAllSites().subscribe({
      next: (agences) => (this.destinations = agences),
      error: () => this.toastr.error('Erreur lors du chargement des agences'),
    });
  }

  // ==========================================================
  // 🧩 Produits
  // ==========================================================
  loadProduits() {
    this.stockService.getProduits().subscribe({
      next: (produits) => { this.produits = produits; },
      error: () => this.toastr.error('Erreur lors du chargement des produits'),
    });
  }


  // ==========================================================
  // 🏢 Sorties par destination
  // ==========================================================
  // === PIE ===
  chargerSortiesParDestination() {
    if (!this.moisSelectionne || !this.anneeSelectionnee) {
      this.onRequestComplete();
      return;
    }

    this.stockService.getSortiesParDestination(this.moisSelectionne, this.anneeSelectionnee)
      .subscribe((res: any) => {
        if (!res.labels || res.labels.length === 0) {
          this.sortieChart = { labels: [], datasets: [] };
          this.updateCharts();
          this.onRequestComplete();
          return;
        }

        this.sortieChart = {
          labels: res.labels,
          datasets: [
            {
              data: res.data,
              backgroundColor: this.generateDynamicColors(res.labels.length, 0.8),
              borderWidth: 1
            }
          ]
        };

        this.updateCharts();
        this.onRequestComplete();
      });
  }


  // ==========================================================
  // 📦 Sorties par destination en Bar
  // ==========================================================
  // === BAR ===
  chargerSortiesParDestinationBar() {
    if (!this.moisSelectionne || !this.anneeSelectionnee) {
      this.onRequestComplete();
      return;
    }

    this.stockService.getSortiesBarParDestination(this.moisSelectionne, this.anneeSelectionnee)
      .subscribe((res: any) => {
        if (!res.labels || res.labels.length === 0 || !res.datasets || res.datasets.length === 0) {
          this.sortieBarChart = { labels: [], datasets: [] };
          this.updateCharts();
          this.onRequestComplete();
          return;
        }

        const backgroundColors = this.generateDynamicColors(res.labels.length, 0.7);
        const borderColors = this.generateDynamicColors(res.labels.length, 1);

        this.sortieBarChart = {
          labels: res.labels,
          datasets: res.datasets.map((ds: any) => ({
            label: ds.label,
            data: ds.data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1
          }))
        };

        this.updateCharts();
        this.onRequestComplete();
      });
  }



  chargerProduitDestination() {
    if (!this.produitSelectionne || !this.destinationSelectionnee) {

      this.onRequestComplete(); // Indiquer la fin de la requête
      return;
    }

    this.stockService
      .getQuantiteProduitParDestinationParMois(this.produitSelectionne, this.destinationSelectionnee, this.anneeSelectionnee)
      .subscribe((res: any) => {

        if (!res.labels || res.labels.length === 0) {
          this.produitDestinationChart = { labels: [], datasets: [] }; // ✅ vide
          this.updateCharts();
          this.onRequestComplete();
          return;
        }

        this.produitDestinationChart = {
          labels: res.labels,
          datasets: [
            {
              label: `Sorties de ${this.produitSelectionne} → ${this.destinationSelectionnee}`,
              data: res.data,
              borderColor: '#2563EB',
              backgroundColor: 'rgba(37,99,235,0.25)',
              pointRadius: 5,
              pointHoverRadius: 7
            }
          ]
        };


        this.updateCharts();
        this.onRequestComplete(); // Indiquer la fin de la requête
      });
  }


  chargerConsommationDestination() {
    if (!this.destinationSelectionnee) {
      this.onRequestComplete();
      return;
    }

    this.stockService
      .getConsommationParDestinationParMois(this.destinationSelectionnee, this.anneeSelectionnee)
      .subscribe((res: any) => {

        if (!res.labels || res.labels.length === 0 || !res.data || res.data.length === 0) {
          this.consommationDestinationChart = { labels: [], datasets: [] }; // ✅ vide
          this.updateCharts();
          this.onRequestComplete();
          return;
        }
        // Assigner les données reçues au graphique. 
        this.consommationDestinationChart = {
          labels: res.labels,
          datasets: [
            {
              label: `Consommation totale`,
              data: res.data,
              backgroundColor: 'rgba(37,99,235,0.3)',
              borderColor: '#2563EB',
              borderWidth: 2
            }
          ]
        };

        this.updateCharts();
        this.onRequestComplete();
      });

  }

  chargerClassementDestinationsProduit() {
  if (!this.produitSelectionne || !this.moisSelectionne || !this.anneeSelectionnee) {
    this.onRequestComplete();
    return;
  }

  this.stockService.getClassementDestinationsParProduit(this.produitSelectionne, this.moisSelectionne, this.anneeSelectionnee)
    .subscribe((res: any) => {
      if (!res.labels || res.labels.length === 0 || !res.datasets || res.datasets.length === 0) {
        this.classementDestinationChart = { labels: [], datasets: [] };
        this.updateCharts();
        this.onRequestComplete();
        return;
      }

      const backgroundColors = this.generateDynamicColors(res.labels.length, 0.7);
      const borderColors = this.generateDynamicColors(res.labels.length, 1);

      this.classementDestinationChart = {
        labels: res.labels,
        datasets: res.datasets.map((ds: any) => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1
        }))
      };

      this.updateCharts();
      this.onRequestComplete();
    }, error => {
      console.error('Erreur lors du chargement du classement des destinations par produit', error);
      this.onRequestComplete();
    });
}


chargerConsommationProduitParPeriode() {
  if (!this.produitSelectionne || !this.moisDebutSelectionne || !this.moisFinSelectionne || !this.anneeSelectionnee) {
    this.onRequestComplete();
    return;
  }

  this.stockService.getConsommationProduitParPeriode(
    this.produitSelectionne,
    this.moisDebutSelectionne,
    this.moisFinSelectionne,
    this.anneeSelectionnee
  )
  .subscribe((res: any) => {
    if (!res.labels || res.labels.length === 0 || !res.datasets || res.datasets.length === 0) {
      this.consommationProduitPeriodeChart = { labels: [], datasets: [] };
      this.updateCharts();
      this.onRequestComplete();
      return;
    }

    const backgroundColors = this.generateDynamicColors(res.labels.length, 0.7);
    const borderColors = this.generateDynamicColors(res.labels.length, 1);
    console.log('moisDebutSelectionne:', this.moisDebutSelectionne );
    console.log('moisFinSelectionne:', this.moisFinSelectionne );
    this.consommationProduitPeriodeChart = {
      labels: res.labels,
      datasets: res.datasets.map((ds: any) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1
      }))
    };

    this.updateCharts();
    this.onRequestComplete();
  }, error => {
    console.error('Erreur lors du chargement de la consommation du produit sur la période', error);
    this.onRequestComplete();
  });
}




  /**
 * Génère un tableau de couleurs HSL uniques, idéal pour 10, 50, 100+ barres.
 */
  generateDynamicColors(count: number, opacity: number = 1): string[] {
    const colors: string[] = [];
    const saturation = 70; // % de saturation
    const lightness = 55;  // % de luminosité

    for (let i = 0; i < count; i++) {
      const hue = Math.round((360 / count) * i); // couleur répartie sur le cercle chromatique
      colors.push(`hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`);
    }

    return colors;
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


  sortieOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: '🏢 Répartition des sorties par destination' },
    },
  };

  sortieBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: '📊 Quantité totale sortie par destination'
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Destinations' },
        ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 }
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Quantité sortie' }
      }
    }
  };

  produitDestinationOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: '📦 Sorties du produit par mois et par destination'
      },
      legend: { display: true }
    },
    scales: {
      y: { beginAtZero: true },
      x: { title: { display: true, text: 'Mois' } }
    }
  };

  consommationDestinationOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: '🔥 Consommation totale de la destination par mois'
      },
      legend: { display: true }
    },
    scales: {
      y: { beginAtZero: true },
      x: { title: { display: true, text: 'Mois' } }
    }
  };

  classementDestinationOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: {
    legend: { display: false },
    title: {
      display: true,
      text: '🏆 Classement des destinations par produit (mois & année)'
    }
  },
  scales: {
    x: {
      title: { display: true, text: 'Destinations' },
      ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 }
    },
    y: {
      beginAtZero: true,
      title: { display: true, text: 'Quantité sortie' }
    }
  }
};

consommationProduitPeriodeOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: {
    legend: { display: false },
    title: {
      display: true,
      text: '📊 Consommation du produit sur une période (toutes destinations)'
    }
  },
  scales: {
    x: {
      title: { display: true, text: 'Destinations' },
      ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 }
    },
    y: {
      beginAtZero: true,
      title: { display: true, text: 'Quantité consommée' }
    }
  }
};







}
