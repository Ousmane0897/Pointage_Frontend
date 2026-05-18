import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { PointageService } from '../../services/pointage.service';
import { Pointage } from '../../models/pointage.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-pointages',
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './pointages.component.html',
  styleUrl: './pointages.component.scss'
})
export class PointagesComponent implements OnInit {

  pointages: Pointage[] = [];
  searchText: string = '';
  sortDirection: boolean = true;
  toastMessage: string | null = null;
  toastTimeout: any;

  page = 0;
  size = 20;
  total = 0;
  totalPages = 0;
  loading = false;

  private destroy$ = inject(DestroyRef);

  constructor(private pointageService: PointageService, private spinner: NgxSpinnerService) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.spinner.show();
    this.pointageService.getTodayPointages(this.page, this.size)
      .pipe(takeUntilDestroyed(this.destroy$))
      .subscribe({
        next: res => {
          this.pointages = res.content;
          this.total = res.totalElements ?? 0;
          this.totalPages = Math.ceil(this.total / this.size);
          this.loading = false;
          this.spinner.hide();
        },
        error: () => {
          this.loading = false;
          this.spinner.hide();
        }
      });
  }

  prevPage() {
    if (this.page > 0) {
      this.page--;
      this.loadData();
    }
  }

  nextPage() {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.loadData();
    }
  }

  get filteredPointages() {
    const term = this.searchText.toLowerCase();
    return this.pointages.filter(pointage =>
      `${pointage.codeSecret} ${pointage.prenom} ${pointage.nom} ${pointage.date}
      ${pointage.heureArrive} ${pointage.heureDepart} ${pointage.duree} ${pointage.status} ${pointage.site}`
        .toLowerCase()
        .includes(term)
    );
  }

  trackById(_: number, item: Pointage): string {
    return item.codeSecret;
  }
}
