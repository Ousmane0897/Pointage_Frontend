import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import {
  BehaviorSubject,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';

import { BulletinPaieService } from '../../../../../services/bulletin-paie.service';
import { BulletinPdfService } from '../../../../../services/bulletin-pdf.service';
import {
  BulletinPaie,
  FiltreBulletin,
  LIBELLES_STATUT_BULLETIN,
  StatutBulletin,
} from '../../../../../models/bulletin-paie.model';
import { PageResponse } from '../../../../../models/pageResponse.model';

@Component({
  selector: 'app-liste-bulletins',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-bulletins.component.html',
  styleUrl: './liste-bulletins.component.scss',
})
export class ListeBulletinsComponent implements OnInit, OnDestroy {

  bulletins: BulletinPaie[] = [];
  total = 0;
  totalPages = 0;
  page = 0;
  size = 10;

  loading = false;
  errorMessage = '';

  filtresForm: FormGroup;
  private refresh$ = new BehaviorSubject<void>(undefined);
  private destroy$ = new Subject<void>();

  readonly STATUTS: StatutBulletin[] = ['BROUILLON', 'VALIDE', 'PAYE', 'ANNULE'];
  readonly LIBELLES_STATUT = LIBELLES_STATUT_BULLETIN;

  readonly MOIS = [
    { v: 1,  l: 'Janvier' },  { v: 2,  l: 'Février' },
    { v: 3,  l: 'Mars' },     { v: 4,  l: 'Avril' },
    { v: 5,  l: 'Mai' },      { v: 6,  l: 'Juin' },
    { v: 7,  l: 'Juillet' },  { v: 8,  l: 'Août' },
    { v: 9,  l: 'Septembre' },{ v: 10, l: 'Octobre' },
    { v: 11, l: 'Novembre' }, { v: 12, l: 'Décembre' },
  ];
  annees: number[] = [];

  constructor(
    private bulletinService: BulletinPaieService,
    private pdfService: BulletinPdfService,
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
  ) {
    const annee = new Date().getFullYear();
    this.annees = [annee - 3, annee - 2, annee - 1, annee, annee + 1];

    this.filtresForm = this.fb.group({
      q: [''],
      departement: [''],
      mois: [''],
      annee: [''],
      statut: [''],
    });
  }

  ngOnInit(): void {
    this.filtresForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 0;
        this.refresh$.next();
      });

    this.refresh$
      .pipe(
        switchMap(() => {
          this.loading = true;
          this.errorMessage = '';
          return this.bulletinService.lister(this.page, this.size, this.buildFiltres()).pipe(
            catchError(() => {
              this.errorMessage = 'Impossible de charger les bulletins.';
              return of({ content: [], totalElements: 0 } as PageResponse<BulletinPaie>);
            }),
            finalize(() => (this.loading = false)),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.bulletins = res.content ?? [];
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.max(1, Math.ceil(this.total / this.size));
      });
  }

  private buildFiltres(): FiltreBulletin {
    const v = this.filtresForm.value;
    const f: FiltreBulletin = {};
    if (v.q) f.q = v.q;
    if (v.departement) f.departement = v.departement;
    if (v.mois) f.mois = Number(v.mois);
    if (v.annee) f.annee = Number(v.annee);
    if (v.statut) f.statut = v.statut as StatutBulletin;
    return f;
  }

  resetFilters(): void {
    this.filtresForm.reset({ q: '', departement: '', mois: '', annee: '', statut: '' });
  }

  pagePrecedente(): void {
    if (this.page > 0) { this.page--; this.refresh$.next(); }
  }

  pageSuivante(): void {
    if (this.page < this.totalPages - 1) { this.page++; this.refresh$.next(); }
  }

  voirFiche(b: BulletinPaie): void {
    if (!b.id) return;
    this.router.navigate(['/admin/rh/paie/historique', b.id]);
  }

  telecharger(b: BulletinPaie): void {
    this.pdfService.telechargerBulletin(b);
  }

  supprimer(b: BulletinPaie): void {
    if (!b.id) return;
    if (!confirm(`Supprimer le bulletin de ${b.nom} ${b.prenom} (${b.periode.mois}/${b.periode.annee}) ?`)) return;
    this.bulletinService.supprimer(b.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Bulletin supprimé.');
          this.refresh$.next();
        },
        error: () => this.toastr.error('Suppression impossible.'),
      });
  }

  formaterFCFA(n: number | undefined): string {
    if (n === undefined || n === null) return '—';
    return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
  }

  nomMois(m: number): string {
    return this.MOIS.find(x => x.v === m)?.l ?? '';
  }

  classeStatut(s: StatutBulletin): string {
    switch (s) {
      case 'BROUILLON': return 'bg-gray-100 text-gray-700';
      case 'VALIDE':    return 'bg-sky-100 text-sky-700';
      case 'PAYE':      return 'bg-emerald-100 text-emerald-700';
      case 'ANNULE':    return 'bg-rose-100 text-rose-700';
    }
  }

  trackById(_: number, b: BulletinPaie): string {
    return b.id ?? `${b.employeId}-${b.periode.mois}-${b.periode.annee}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
