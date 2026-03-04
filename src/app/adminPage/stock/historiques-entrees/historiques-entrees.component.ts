import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { MouvementEntreeStock } from '../../../models/MouvementEntreeStock.model';
import { StockService } from '../../../services/stock.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-historiques-entrees',
  imports: [CommonModule, FormsModule],
  templateUrl: './historiques-entrees.component.html',
  styleUrls: ['./historiques-entrees.component.scss']
})
export class HistoriquesEntreesComponent implements OnInit {

  entrees: MouvementEntreeStock[] = [];
  selectedProduit: any = null;
  private destroy$ = inject(DestroyRef);

  constructor(private stockService: StockService, private toastr: ToastrService) { }

  ngOnInit(): void {
    this.loadEntrees();
  }

  closeModal() {
    this.selectedProduit = null;
  }

  openModal(entree: MouvementEntreeStock) {
    this.selectedProduit = entree;
  }

  loadEntrees() {
    this.stockService.getEntrees().pipe(takeUntilDestroyed(this.destroy$)).subscribe({
      next: (data) => {
        this.entrees = data.map(entree => ({
          ...entree,
          dateMouvement: entree.dateMouvement ? new Date(entree.dateMouvement) : null,
          dateDePeremption: entree.dateDePeremption ? new Date(entree.dateDePeremption) : null
        }));
      },
      error: (error) => {
        console.error('Erreur lors du chargement des entrées de stock', error);
        this.toastr.error('Erreur lors du chargement des entrées de stock', 'Erreur');
      }
    });
  }

  trackById(_: number, item: MouvementEntreeStock): string { // Optimisation Angular pour le rendu de listes. _ est un paramètre inutilisé, on utilise item.codeProduit comme identifiant unique pour chaque entrée de stock.
    return item.codeProduit;

  }


}
