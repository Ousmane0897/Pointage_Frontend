import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  Subject,
  catchError,
  finalize,
  of,
  takeUntil,
  forkJoin,
} from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { ContratService } from '../../../../../services/contrat.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import { Contrat, TypeContrat } from '../../../../../models/contrat.model';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';

@Component({
  selector: 'app-formulaire-contrat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './formulaire-contrat.component.html',
  styleUrl: './formulaire-contrat.component.scss',
})
export class FormulaireContratComponent implements OnInit, OnDestroy {

  // ─── Mode ─────────────────────────────────────────────────────────────────
  isEditMode = false;
  contratId: string | null = null;
  routeEmployeId: string | null = null;

  // ─── Modèle du formulaire ─────────────────────────────────────────────────
  contratData: Contrat = {
    employeId: '',
    typeContrat: 'CDI',
    dateDebut: null,
    dateFin: null,
    statut: 'ACTIF',
    clauses: '',
    joursAvantAlerte: 30,
  };

  // ─── Employés (pour la sélection) ────────────────────────────────────────
  employes: DossierEmploye[] = [];
  employeSelectionne: DossierEmploye | null = null;

  // ─── États UI ─────────────────────────────────────────────────────────────
  loading = false;
  saving = false;
  errorMessage = '';

  // ─── Cycle de vie ─────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private contratService: ContratService,
    private dossierEmployeService: DossierEmployeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        // Mode édition
        this.isEditMode = true;
        this.contratId = params['id'];
        this.loadContratForEdit(params['id']);
      } else {
        // Mode création
        this.routeEmployeId = params['employeId'] ?? null;
        if (this.routeEmployeId) {
          this.contratData.employeId = this.routeEmployeId;
          this.loadEmployeById(this.routeEmployeId);
        } else {
          this.loadEmployesList();
        }
      }
    });
  }

  // ─── Chargement contrat (édition) ─────────────────────────────────────────
  private loadContratForEdit(id: string): void {
    this.loading = true;
    forkJoin({
      contrat: this.contratService.getContratById(id).pipe(catchError(() => of(null))),
      employes: this.dossierEmployeService.getEmployes(0, 200).pipe(catchError(() => of({ content: [], totalElements: 0 }))),
    })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(({ contrat, employes }) => {
        this.employes = employes.content;
        if (contrat) {
          this.contratData = { ...contrat };
        } else {
          this.toastr.error('Contrat introuvable.', 'Erreur');
          this.router.navigate(['/admin/rh/gestion-du-personnel/contrats']);
        }
      });
  }

  // ─── Chargement d'un employé spécifique ───────────────────────────────────
  private loadEmployeById(employeId: string): void {
    this.loading = true;
    this.dossierEmployeService
      .getEmployeById(employeId)
      .pipe(
        catchError(() => of(null)),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(employe => {
        if (employe) {
          this.employeSelectionne = employe;
        } else {
          this.toastr.error('Employé introuvable.', 'Erreur');
        }
      });
  }

  // ─── Chargement liste employés ────────────────────────────────────────────
  private loadEmployesList(): void {
    this.loading = true;
    this.dossierEmployeService
      .getEmployes(0, 200)
      .pipe(
        catchError(() => of({ content: [], totalElements: 0 })),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.employes = res.content;
      });
  }

  // ─── Helpers type contrat ─────────────────────────────────────────────────
  get isDateFinRequired(): boolean {
    return this.contratData.typeContrat !== 'CDI';
  }

  get showJoursAlerte(): boolean {
    return this.contratData.typeContrat === 'CDD' || this.contratData.typeContrat === 'STAGE';
  }

  onTypeContratChange(): void {
    if (this.contratData.typeContrat === 'CDI') {
      this.contratData.dateFin = null;
    }
  }

  // ─── Sauvegarde ───────────────────────────────────────────────────────────
  sauvegarder(form: NgForm): void {
    if (form.invalid) {
      Object.values(form.controls).forEach(ctrl => ctrl.markAsTouched());
      this.toastr.warning('Veuillez corriger les erreurs dans le formulaire.', 'Formulaire invalide');
      return;
    }

    if (this.isDateFinRequired && !this.contratData.dateFin) {
      this.toastr.warning('La date de fin est obligatoire pour ce type de contrat.', 'Champ requis');
      return;
    }

    this.saving = true;

    const operation$ = this.isEditMode && this.contratId
      ? this.contratService.modifierContrat(this.contratId, this.contratData)
      : this.contratService.creerContrat(this.contratData);

    operation$
      .pipe(
        catchError(err => {
          console.error('Erreur sauvegarde contrat :', err);
          const msg = err?.error?.message ?? 'Erreur lors de la sauvegarde du contrat.';
          this.toastr.error(msg, 'Erreur');
          return of(null);
        }),
        finalize(() => (this.saving = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        if (res) {
          const action = this.isEditMode ? 'modifié' : 'créé';
          this.toastr.success(`Contrat ${action} avec succès.`, 'Succès');
          this.router.navigate(['/admin/rh/gestion-du-personnel/contrats']);
        }
      });
  }

  // ─── Annulation ───────────────────────────────────────────────────────────
  annuler(): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/contrats']);
  }

  // ─── Nettoyage ────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
