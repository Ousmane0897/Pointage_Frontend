import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
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

import { GrilleSalarialeService } from '../../../../../services/grille-salariale.service';
import {
  CategorieProfessionnelle,
  FiltreGrilleSalariale,
  RegimeIpres,
} from '../../../../../models/grille-salariale.model';

@Component({
  selector: 'app-liste-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-categories.component.html',
  styleUrl: './liste-categories.component.scss',
})
export class ListeCategoriesComponent implements OnInit, OnDestroy {

  categories: CategorieProfessionnelle[] = [];
  loading = false;
  errorMessage = '';

  filtresForm: FormGroup;
  private refresh$ = new BehaviorSubject<void>(undefined);
  private destroy$ = new Subject<void>();

  constructor(
    private grilleService: GrilleSalarialeService,
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
  ) {
    this.filtresForm = this.fb.group({
      q: [''],
      regimeIpres: [''],
      actif: [''],
    });
  }

  ngOnInit(): void {
    this.filtresForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.refresh$.next());

    this.refresh$
      .pipe(
        switchMap(() => {
          this.loading = true;
          this.errorMessage = '';
          return this.grilleService.lister(this.buildFiltres()).pipe(
            catchError(err => {
              this.errorMessage = 'Impossible de charger la grille salariale.';
              return of([] as CategorieProfessionnelle[]);
            }),
            finalize(() => (this.loading = false)),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(data => (this.categories = data));
  }

  private buildFiltres(): FiltreGrilleSalariale {
    const v = this.filtresForm.value;
    const f: FiltreGrilleSalariale = {};
    if (v.q) f.q = v.q;
    if (v.regimeIpres) f.regimeIpres = v.regimeIpres as RegimeIpres;
    if (v.actif !== '' && v.actif !== null && v.actif !== undefined) {
      f.actif = v.actif === 'true' || v.actif === true;
    }
    return f;
  }

  resetFilters(): void {
    this.filtresForm.reset({ q: '', regimeIpres: '', actif: '' });
  }

  nouvelle(): void {
    this.router.navigate(['/admin/rh/paie/grille-salariale/nouvelle']);
  }

  modifier(cat: CategorieProfessionnelle): void {
    if (!cat.id) return;
    this.router.navigate(['/admin/rh/paie/grille-salariale', cat.id, 'modifier']);
  }

  supprimer(cat: CategorieProfessionnelle): void {
    if (!cat.id) return;
    if (!confirm(`Supprimer la catégorie « ${cat.libelle} » ?`)) return;
    this.grilleService.supprimer(cat.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Catégorie supprimée.');
          this.refresh$.next();
        },
        error: () => this.toastr.error('Suppression impossible.'),
      });
  }

  basculerActif(cat: CategorieProfessionnelle): void {
    if (!cat.id) return;
    this.grilleService.basculerActif(cat.id, !cat.actif)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(cat.actif ? 'Catégorie désactivée.' : 'Catégorie activée.');
          this.refresh$.next();
        },
        error: () => this.toastr.error('Opération impossible.'),
      });
  }

  formaterFCFA(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n ?? 0)) + ' FCFA';
  }

  totalPrimes(cat: CategorieProfessionnelle): number {
    return (cat.primes ?? []).reduce((s, p) => s + (p.montant || 0), 0);
  }

  totalIndemnites(cat: CategorieProfessionnelle): number {
    return (cat.indemnites ?? []).reduce((s, i) => s + (i.montant || 0), 0);
  }

  trackById(_: number, c: CategorieProfessionnelle): string {
    return c.id ?? c.code;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
