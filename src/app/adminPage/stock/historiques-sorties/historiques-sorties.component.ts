import { Component, OnInit } from '@angular/core';
import { MouvementSortieStock } from '../../../models/MouvementSortieStock.model';
import { ToastrService } from 'ngx-toastr';
import { StockService } from '../../../services/stock.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-historiques-sorties',
  imports: [CommonModule, FormsModule],
  templateUrl: './historiques-sorties.component.html',
  styleUrl: './historiques-sorties.component.scss'
})
export class HistoriquesSortiesComponent implements OnInit {


  sorties: MouvementSortieStock[] = [];
  selectedProduit: any = null;
  searchText: string = '';
  searchText2: string = '';

  constructor(private stockService: StockService, private toastr: ToastrService) { }

  ngOnInit(): void {
    this.loadSorties();
  }

  closeModal() {
    this.selectedProduit = null;
  }

  get filteredSorties() {
    const term = this.searchText.toLowerCase();
    return this.sorties.filter(sortie =>
      sortie.destination.toLowerCase().includes(term)
    );
  }

  get filteredSortiesByMonth() {
    const monthTerm = this.searchText2.toLowerCase();
    return this.filteredSorties.filter(sortie => {
      const month = sortie.mois ? sortie.mois.toLowerCase() : '';
      return month.includes(monthTerm);
    });
  }


  loadSorties() {
    this.stockService.getSorties().subscribe({
      next: (data) => {
        this.sorties = data.map(sortie => ({
          ...sortie,
          dateMouvement: sortie.dateMouvement ? new Date(sortie.dateMouvement) : null
        }));
      },
      error: (error) => {
        console.error('Erreur lors du chargement des sorties de stock', error);
        this.toastr.error('Erreur lors du chargement des sorties de stock', 'Erreur');
      }
    });
  }


}
