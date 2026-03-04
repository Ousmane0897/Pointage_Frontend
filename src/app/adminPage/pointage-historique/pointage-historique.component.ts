import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, Subject, debounceTime, startWith, switchMap, takeUntil } from 'rxjs';
import { PointageService } from '../../services/pointage.service';
import { Pointage } from '../../models/pointage.model';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-pointage-historique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pointage-historique.component.html',
  styleUrl: './pointage-historique.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PointageHistoriqueComponent implements OnInit, OnDestroy {

  // 📊 Données
  pointages: Pointage[] = [];
  totalPages = 0;

  // 📄 Pagination
  page = 0;
  size = 20;

  // 🔎 Filtres
  search = '';
  dateDebut = '';
  dateFin = '';

  // 🔁 Flux RxJS
  private trigger$ = new BehaviorSubject<void>(void 0); // Permet de déclencher la recherche à la fois au chargement et lors des changements de filtres/pagination. void 0 est utilisé pour indiquer que c'est un déclenchement initial sans données spécifiques à transmettre. Chaque fois que trigger$.next() est appelé, cela indique que les critères de recherche ont changé et que les données doivent être rechargées en fonction des nouveaux critères.
  private destroy$ = new Subject<void>();

  constructor(private pointageService: PointageService, private spinner: NgxSpinnerService) {}

  ngOnInit(): void {

    this.spinner.show();
    this.trigger$
      .pipe(
        debounceTime(400),        // ⏳ éviter les appels trop fréquents lors de la saisie
        switchMap(() =>
          this.pointageService.searchHistorique(
            this.search,
            this.dateDebut,
            this.dateFin,
            this.page,
            this.size
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(res => {
        this.spinner.hide();
        this.pointages = res.content;
        this.totalPages = res.totalPages;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🔎 Recherche
  onSearchChange(): void {
    this.page = 0;
    this.trigger$.next();
  }

  // 📅 Changement de dates
  onDateChange(): void {
    this.page = 0;
    this.trigger$.next();
  }

  // 📄 Pagination
  changePage(newPage: number): void {
    if (newPage >= 0 && newPage < this.totalPages) {
      this.page = newPage;
      this.trigger$.next();
    }
  }

  // 📤 Export Excel
  exportExcel(): void {
    this.pointageService
      .exportExcel(this.search, this.dateDebut, this.dateFin)
      .pipe(takeUntil(this.destroy$))
      .subscribe(blob => this.download(blob, 'pointages.xlsx'));
  }

  // 📄 Export PDF
  exportPdf(): void {
    this.pointageService
      .exportPdf(this.search, this.dateDebut, this.dateFin)
      .pipe(takeUntil(this.destroy$))
      .subscribe(blob => this.download(blob, 'pointages.pdf'));
  }

  // ⬇️ Téléchargement sécurisé
  private download(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ⚡ Optimisation ngFor
  trackById(_: number, item: Pointage): string {
    return item.codeSecret; // ou un autre identifiant unique
  }
}