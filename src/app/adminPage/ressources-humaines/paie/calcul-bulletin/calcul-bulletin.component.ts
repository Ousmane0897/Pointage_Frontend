import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import {
  Subject,
  combineLatest,
  debounceTime,
  forkJoin,
  of,
  takeUntil,
} from 'rxjs';
import { catchError } from 'rxjs/operators';

import { BulletinPaieService } from '../../../../services/bulletin-paie.service';
import { GrilleSalarialeService } from '../../../../services/grille-salariale.service';
import { EmployeCompletService } from '../../../../services/employe-complet.service';
import { RecapitulatifMensuelService } from '../../../../services/recapitulatif-mensuel.service';
import { EmployeComplet } from '../../../../models/employe-complet.model';
import { CategorieProfessionnelle } from '../../../../models/grille-salariale.model';
import { RecapitulatifMensuel } from '../../../../models/recapitulatif-mensuel.model';
import { BulletinPaie } from '../../../../models/bulletin-paie.model';
import { PreviewBulletinComponent } from './preview-bulletin/preview-bulletin.component';

@Component({
  selector: 'app-calcul-bulletin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    PreviewBulletinComponent,
  ],
  templateUrl: './calcul-bulletin.component.html',
  styleUrl: './calcul-bulletin.component.scss',
})
export class CalculBulletinComponent implements OnInit, OnDestroy {

  form: FormGroup;

  employes: EmployeComplet[] = [];
  categories: CategorieProfessionnelle[] = [];

  loadingData = false;
  calculating = false;
  saving = false;

  bulletin: BulletinPaie | null = null;
  recap: RecapitulatifMensuel | null = null;

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
    private grilleService: GrilleSalarialeService,
    private employeService: EmployeCompletService,
    private recapService: RecapitulatifMensuelService,
    private router: Router,
    private toastr: ToastrService,
  ) {
    const now = new Date();
    const annee = now.getFullYear();
    const mois = now.getMonth() + 1;
    this.annees = [annee - 2, annee - 1, annee, annee + 1];

    this.form = this.fb.group({
      employeId: ['', Validators.required],
      categorieId: [''],
      mois: [mois, Validators.required],
      annee: [annee, Validators.required],
    });
  }

  ngOnInit(): void {
    this.chargerDonnees();

    combineLatest([
      this.form.get('employeId')!.valueChanges,
      this.form.get('categorieId')!.valueChanges,
      this.form.get('mois')!.valueChanges,
      this.form.get('annee')!.valueChanges,
    ])
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => this.recalculer());
  }

  private chargerDonnees(): void {
    this.loadingData = true;
    forkJoin({
      employes: this.employeService.getAllEmployesComplet().pipe(
        catchError(() => of([] as EmployeComplet[])),
      ),
      categories: this.grilleService.lister({ actif: true }).pipe(
        catchError(() => of([] as CategorieProfessionnelle[])),
      ),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ employes, categories }) => {
        this.employes = employes;
        this.categories = categories;
        this.loadingData = false;
      });
  }

  recalculer(): void {
    const { employeId, categorieId, mois, annee } = this.form.value;
    if (!employeId || !mois || !annee) {
      this.bulletin = null;
      return;
    }
    const employe = this.employes.find(e => (e.id ?? e.agentId) === employeId);
    if (!employe) {
      this.bulletin = null;
      return;
    }
    const categorie = categorieId
      ? this.categories.find(c => c.id === categorieId) ?? null
      : null;

    this.calculating = true;
    this.recapService.genererRecap({
      mois,
      annee,
      q: employe.matricule,
    })
      .pipe(
        catchError(() => of([] as RecapitulatifMensuel[])),
        takeUntil(this.destroy$),
      )
      .subscribe(recaps => {
        this.recap = recaps.find(r => r.matricule === employe.matricule) ?? null;
        this.bulletin = this.bulletinService.calculerBulletin(
          employe,
          categorie,
          this.recap,
          { mois, annee },
        );
        this.calculating = false;
      });
  }

  enregistrer(): void {
    if (!this.bulletin) return;
    this.saving = true;
    this.bulletinService.enregistrer(this.bulletin)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: saved => {
          this.toastr.success('Bulletin enregistré en brouillon.');
          this.saving = false;
          if (saved.id) {
            this.router.navigate(['/admin/rh/paie/historique', saved.id]);
          }
        },
        error: () => {
          this.toastr.error('Enregistrement impossible.');
          this.saving = false;
        },
      });
  }

  genererPdf(): void {
    if (!this.bulletin) return;
    if (!this.bulletin.id) {
      this.toastr.info('Enregistre d\'abord le bulletin pour générer un PDF persistant.');
    }
    this.router.navigate(
      ['/admin/rh/paie/bulletins-pdf', this.bulletin.id ?? 'nouveau'],
      { state: { bulletin: this.bulletin } },
    );
  }

  employeLabel(e: EmployeComplet): string {
    return `${e.matricule} — ${e.nom} ${e.prenom}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
