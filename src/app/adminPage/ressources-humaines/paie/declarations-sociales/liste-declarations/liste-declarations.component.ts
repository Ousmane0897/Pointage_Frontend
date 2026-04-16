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

import { DeclarationSocialeService } from '../../../../../services/declaration-sociale.service';
import {
  DeclarationSociale,
  FiltreDeclaration,
  LIBELLES_TYPE_DECLARATION,
  StatutDeclaration,
  TypeDeclaration,
} from '../../../../../models/declaration-sociale.model';

@Component({
  selector: 'app-liste-declarations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-declarations.component.html',
  styleUrl: './liste-declarations.component.scss',
})
export class ListeDeclarationsComponent implements OnInit, OnDestroy {

  declarations: DeclarationSociale[] = [];
  loading = false;
  errorMessage = '';

  filtresForm: FormGroup;
  private refresh$ = new BehaviorSubject<void>(undefined);
  private destroy$ = new Subject<void>();

  readonly TYPES: TypeDeclaration[] = [
    'IPRES_MENSUELLE', 'IPRES_ANNUELLE',
    'CSS_MENSUELLE', 'CSS_ANNUELLE',
    'INSPECTION_TRAVAIL',
  ];
  readonly LIBELLES_TYPE = LIBELLES_TYPE_DECLARATION;

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
    private service: DeclarationSocialeService,
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
  ) {
    const annee = new Date().getFullYear();
    this.annees = [annee - 3, annee - 2, annee - 1, annee, annee + 1];

    this.filtresForm = this.fb.group({
      type: [''],
      mois: [''],
      annee: [''],
      statut: [''],
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
          return this.service.lister(this.buildFiltres()).pipe(
            catchError(() => {
              this.errorMessage = 'Impossible de charger les déclarations.';
              return of([] as DeclarationSociale[]);
            }),
            finalize(() => (this.loading = false)),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(data => (this.declarations = data));
  }

  private buildFiltres(): FiltreDeclaration {
    const v = this.filtresForm.value;
    const f: FiltreDeclaration = {};
    if (v.type) f.type = v.type as TypeDeclaration;
    if (v.mois) f.mois = Number(v.mois);
    if (v.annee) f.annee = Number(v.annee);
    if (v.statut) f.statut = v.statut as StatutDeclaration;
    return f;
  }

  resetFilters(): void {
    this.filtresForm.reset({ type: '', mois: '', annee: '', statut: '' });
  }

  nouvelle(): void {
    this.router.navigate(['/admin/rh/paie/declarations/generer']);
  }

  exporterPdf(d: DeclarationSociale): void {
    this.service.exportPdf(d);
  }

  exporterExcel(d: DeclarationSociale): void {
    this.service.exportExcel(d);
  }

  supprimer(d: DeclarationSociale): void {
    if (!d.id) return;
    if (!confirm(`Supprimer la déclaration « ${d.libelle} » ?`)) return;
    this.service.supprimer(d.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Déclaration supprimée.');
          this.refresh$.next();
        },
        error: () => this.toastr.error('Suppression impossible.'),
      });
  }

  formaterFCFA(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n ?? 0)) + ' FCFA';
  }

  nomMois(m: number | undefined): string {
    if (!m) return '—';
    return this.MOIS.find(x => x.v === m)?.l ?? '';
  }

  classeStatut(s: StatutDeclaration): string {
    switch (s) {
      case 'BROUILLON': return 'bg-gray-100 text-gray-700';
      case 'GENEREE':   return 'bg-sky-100 text-sky-700';
      case 'TRANSMISE': return 'bg-emerald-100 text-emerald-700';
      case 'ARCHIVEE':  return 'bg-violet-100 text-violet-700';
    }
  }

  trackById(_: number, d: DeclarationSociale): string {
    return d.id ?? `${d.type}-${d.mois ?? 'A'}-${d.annee}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
