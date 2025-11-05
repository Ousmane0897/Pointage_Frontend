import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MouvementEntreeStock } from '../../../models/MouvementEntreeStock.model';
import { StockService } from '../../../services/stock.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-historiques-entrees',
  imports: [CommonModule],
  templateUrl: './historiques-entrees.component.html',
  styleUrls: ['./historiques-entrees.component.scss']
})
export class HistoriquesEntreesComponent implements OnInit {

  entrees: MouvementEntreeStock[] = [];
  selectedProduit: any = null;

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
    this.stockService.getEntrees().subscribe({
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


}
