import { Component } from '@angular/core';
import { StockService } from '../../../services/stock.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-rapport-mensuel',
  imports: [CommonModule, FormsModule],
  templateUrl: './rapport-mensuel.component.html',
  styleUrl: './rapport-mensuel.component.scss'
})
export class RapportMensuelComponent {

   moisSelectionne = new Date().getMonth() + 1;  // ex: 10 pour Octobre
   anneeSelectionnee = new Date().getFullYear(); // ex: 2025
   moisDisponibles = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

  rapport: any = null;
  loading = false; // Indicateur de chargement.

  constructor(private stockService: StockService) {}

  ngOnInit() {
    this.chargerRapport();
  }

  chargerRapport() {
    this.loading = true;
    this.stockService.getRapportMensuel(this.moisSelectionne, this.anneeSelectionnee).subscribe({
      next: (res) => {
        this.rapport = res;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

}
