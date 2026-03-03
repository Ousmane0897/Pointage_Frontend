import { Component, OnInit } from '@angular/core';
import { debounceTime , Subject } from 'rxjs';
import { PointageService } from '../../services/pointage.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pointage } from '../../models/pointage.model';

@Component({
  selector: 'app-pointage-historique',
  imports: [CommonModule, FormsModule],
  templateUrl: './pointage-historique.component.html',
  styleUrl: './pointage-historique.component.scss'
})
export class PointageHistoriqueComponent implements OnInit {


  pointages: Pointage[] = [];

  page = 0;
  size = 20;
  totalPages = 0;

  search = '';
  dateDebut = '';
  dateFin = '';

  searchSubject = new Subject<string>();

  constructor(private pointageService: PointageService) { }
  
  ngOnInit(): void {
    this.loadData();

    this.searchSubject
      .pipe(debounceTime(400))
      .subscribe(() => {
        this.page = 0;
        this.loadData();
      });
  }

  loadData() {
    this.pointageService
      .searchHistorique(
        this.search,
        this.dateDebut,
        this.dateFin,
        this.page,
        this.size
      )
      .subscribe(res => {
        this.pointages = res.content;
        this.totalPages = res.totalPages;
      });
  }

  onSearchChange() {
    this.searchSubject.next(this.search);
  }

  changePage(newPage: number) {
    if (newPage >= 0 && newPage < this.totalPages) {
      this.page = newPage;
      this.loadData();
    }
  }

  exportExcel() {
    this.pointageService
      .exportExcel(this.search, this.dateDebut, this.dateFin)
      .subscribe(blob => {
        this.download(blob, 'pointages.xlsx');
      });
  }

  exportPdf() {
    this.pointageService
      .exportPdf(this.search, this.dateDebut, this.dateFin)
      .subscribe(blob => {
        this.download(blob, 'pointages.pdf');
      });
  }

  private download(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

}
