import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { RecapitulatifMensuelService } from '../../../../services/recapitulatif-mensuel.service';
import {
  RecapitulatifMensuel,
  FiltreRecap,
} from '../../../../models/recapitulatif-mensuel.model';

@Component({
  selector: 'app-recapitulatif-mensuel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './recapitulatif-mensuel.component.html',
  styleUrl: './recapitulatif-mensuel.component.scss',
})
export class RecapitulatifMensuelComponent implements OnInit, OnDestroy {

  recaps: RecapitulatifMensuel[] = [];
  loading = false;
  loaded = false;

  filtres: FiltreRecap = {
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    departement: '',
    site: '',
    q: '',
  };

  mois = [
    { v: 1,  l: 'Janvier' },  { v: 2,  l: 'Février' },
    { v: 3,  l: 'Mars' },     { v: 4,  l: 'Avril' },
    { v: 5,  l: 'Mai' },      { v: 6,  l: 'Juin' },
    { v: 7,  l: 'Juillet' },  { v: 8,  l: 'Août' },
    { v: 9,  l: 'Septembre' },{ v: 10, l: 'Octobre' },
    { v: 11, l: 'Novembre' }, { v: 12, l: 'Décembre' },
  ];

  annees: number[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private recapService: RecapitulatifMensuelService,
    private toastr: ToastrService,
  ) {
    const currentYear = new Date().getFullYear();
    this.annees = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }

  ngOnInit(): void {
    this.generer();
  }

  generer(): void {
    this.loading = true;
    const f: FiltreRecap = {
      mois: this.filtres.mois,
      annee: this.filtres.annee,
      departement: this.filtres.departement || undefined,
      site: this.filtres.site || undefined,
      q: this.filtres.q || undefined,
    };
    this.recapService.genererRecap(f).pipe(
      catchError(err => { this.handleError(err); return of([] as RecapitulatifMensuel[]); }),
      finalize(() => { this.loading = false; this.loaded = true; }),
      takeUntil(this.destroy$),
    ).subscribe(res => (this.recaps = res));
  }

  exporterExcel(): void {
    if (this.recaps.length === 0) {
      this.toastr.info('Aucune donnée à exporter.', 'Export');
      return;
    }
    this.recapService.exportExcel(this.recaps, this.filtres.mois, this.filtres.annee);
    this.toastr.success('Export Excel généré.', 'Succès');
  }

  exporterPdf(): void {
    if (this.recaps.length === 0) {
      this.toastr.info('Aucune donnée à exporter.', 'Export');
      return;
    }
    this.recapService.exportPdf(this.recaps, this.filtres.mois, this.filtres.annee);
    this.toastr.success('Export PDF généré.', 'Succès');
  }

  // ─── Totaux agrégés ──────────────────────────────────────────────────────
  get totalEffectif(): number { return this.recaps.length; }
  get totalJoursTravailles(): number {
    return this.recaps.reduce((s, r) => s + (r.joursTravailles || 0), 0);
  }
  get totalAbsences(): number {
    return this.recaps.reduce((s, r) => s + (r.joursAbsence || 0), 0);
  }
  get totalRetards(): number {
    return this.recaps.reduce((s, r) => s + (r.nombreRetards || 0), 0);
  }
  get totalHS(): number {
    return this.recaps.reduce((s, r) => s + (r.heuresSupTotal || 0), 0);
  }

  trackById(_: number, r: RecapitulatifMensuel): string { return r.employeId; }

  private handleError(err: any): void {
    console.error(err);
    if (err?.status === 0) this.toastr.error('Serveur injoignable.', 'Erreur réseau');
    else this.toastr.error('Une erreur est survenue.', 'Erreur');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
