import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, catchError, of, takeUntil } from 'rxjs';

import { BulletinPaieService } from '../../../../../services/bulletin-paie.service';
import { DeclarationSocialeService } from '../../../../../services/declaration-sociale.service';
import { BulletinPaie } from '../../../../../models/bulletin-paie.model';
import {
  DeclarationSociale,
  LIBELLES_TYPE_DECLARATION,
  TypeDeclaration,
} from '../../../../../models/declaration-sociale.model';

@Component({
  selector: 'app-generation-declaration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './generation-declaration.component.html',
  styleUrl: './generation-declaration.component.scss',
})
export class GenerationDeclarationComponent implements OnInit, OnDestroy {

  form: FormGroup;
  loading = false;
  saving = false;
  preview: DeclarationSociale | null = null;

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

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private bulletinService: BulletinPaieService,
    private declarationService: DeclarationSocialeService,
    private router: Router,
    private toastr: ToastrService,
  ) {
    const now = new Date();
    const annee = now.getFullYear();
    this.annees = [annee - 3, annee - 2, annee - 1, annee, annee + 1];

    this.form = this.fb.group({
      type: ['IPRES_MENSUELLE' as TypeDeclaration, Validators.required],
      mois: [now.getMonth() + 1],
      annee: [annee, Validators.required],
    });
  }

  ngOnInit(): void {}

  get typeValue(): TypeDeclaration { return this.form.value.type; }

  get estAnnuelle(): boolean {
    return this.typeValue === 'IPRES_ANNUELLE' || this.typeValue === 'CSS_ANNUELLE';
  }

  genererApercu(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { type, mois, annee } = this.form.value;
    const moisEffectif = this.estAnnuelle ? undefined : Number(mois);

    this.loading = true;
    this.preview = null;

    this.bulletinService.lister(0, 1000, {
      mois: moisEffectif,
      annee: Number(annee),
      statut: 'VALIDE',
    })
      .pipe(
        catchError(() => of({ content: [], totalElements: 0, totalPages: 0 } as { content: BulletinPaie[]; totalElements: number; totalPages: number })),
        takeUntil(this.destroy$),
      )
      .subscribe(page => {
        const bulletins = page.content ?? [];
        if (bulletins.length === 0) {
          this.toastr.warning('Aucun bulletin validé sur la période sélectionnée.');
        }
        this.preview = this.declarationService.construireDepuisBulletins(
          type,
          bulletins,
          moisEffectif,
          Number(annee),
        );
        this.loading = false;
      });
  }

  enregistrer(): void {
    if (!this.preview) return;
    this.saving = true;
    this.declarationService.enregistrer(this.preview)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Déclaration enregistrée.');
          this.saving = false;
          this.router.navigate(['/admin/rh/paie/declarations']);
        },
        error: () => {
          this.toastr.error('Enregistrement impossible.');
          this.saving = false;
        },
      });
  }

  exporterPdf(): void {
    if (this.preview) this.declarationService.exportPdf(this.preview);
  }

  exporterExcel(): void {
    if (this.preview) this.declarationService.exportExcel(this.preview);
  }

  retour(): void {
    this.router.navigate(['/admin/rh/paie/declarations']);
  }

  formaterFCFA(n: number | undefined): string {
    if (n === undefined || n === null) return '—';
    return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
