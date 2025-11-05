import { Component } from '@angular/core';
import { StockService } from '../../../services/stock.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-suivi-stock',
    imports: [CommonModule],
    templateUrl: './suivi-stock.component.html',
    styleUrls: ['./suivi-stock.component.scss']
})
export class SuiviStockComponent {

  suivi: any[] = [];
  loading = true;

  constructor(private stockService: StockService) {}

  ngOnInit(): void {
    this.stockService.getSuiviStock().subscribe({
      next: (data) => {
        this.suivi = data;
        this.loading = false; 
      },
      error: () => (this.loading = false)
    });
  }

  getEtatColor(etat: string): string {
    switch (etat) {
      case 'RUPTURE':
        return 'bg-red-100 text-red-700';
      case 'BAS':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-green-100 text-green-700';
    }
  }

}
