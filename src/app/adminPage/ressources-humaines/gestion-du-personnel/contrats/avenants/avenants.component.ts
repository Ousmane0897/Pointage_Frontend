import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  Subject,
  catchError,
  finalize,
  forkJoin,
  of,
  takeUntil,
} from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { ContratService } from '../../../../../services/contrat.service';
import { Contrat, Avenant, Renouvellement } from '../../../../../models/contrat.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-avenants',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './avenants.component.html',
  styleUrl: './avenants.component.scss',
})
export class AvenantsComponent implements OnInit, OnDestroy {

  // ─── Données ─────────────────────────────────────────────────────────────
  contrat: Contrat | null = null;
  avenants: Avenant[] = [];
  renouvellements: Renouvellement[] = [];
  contratId = '';

  // ─── Formulaire avenant (Reactive) ────────────────────────────────────────
  showAvenantForm = false;
  avenantForm!: FormGroup;
  savingAvenant = false;

  // ─── Formulaire renouvellement (Reactive) ─────────────────────────────────
  showRenouvellementForm = false;
  renouvellementForm!: FormGroup;
  savingRenouvellement = false;

  // ─── États UI ─────────────────────────────────────────────────────────────
  loading = false;

  // ─── Cycle de vie ─────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private contratService: ContratService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.initAvenantForm();
    this.initRenouvellementForm();
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.contratId = params['id'];
      if (this.contratId) {
        this.loadAll();
      }
    });
  }

  /** Initialise le FormGroup de création d'avenant. */
  private initAvenantForm(): void {
    this.avenantForm = this.fb.group({
      objet: ['', Validators.required],
      dateEffet: [null, Validators.required],
      description: [''],
    });
  }

  /** Initialise le FormGroup de renouvellement de contrat. */
  private initRenouvellementForm(): void {
    this.renouvellementForm = this.fb.group({
      nouvelleDateFin: [null, Validators.required],
      motif: ['', Validators.required],
    });
  }

  // ─── Chargement initial (contrat + avenants + renouvellements) ─────────────
  private loadAll(): void {
    this.loading = true;
    forkJoin({
      contrat: this.contratService.getContratById(this.contratId).pipe(catchError(() => of(null))),
      avenants: this.contratService.getAvenants(this.contratId).pipe(catchError(() => of([]))),
      renouvellements: this.contratService.getRenouvellements(this.contratId).pipe(catchError(() => of([]))),
    })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(({ contrat, avenants, renouvellements }) => {
        if (contrat) {
          this.contrat = contrat;
        } else {
          this.toastr.error('Contrat introuvable.', 'Erreur');
          this.router.navigate(['/admin/rh/gestion-du-personnel/contrats']);
          return;
        }
        this.avenants = avenants;
        this.renouvellements = renouvellements;
      });
  }

  // ─── Avenants ─────────────────────────────────────────────────────────────
  toggleAvenantForm(): void {
    this.showAvenantForm = !this.showAvenantForm;
    if (!this.showAvenantForm) {
      this.avenantForm.reset({ objet: '', dateEffet: null, description: '' });
    }
  }

  creerAvenant(): void {
    if (this.avenantForm.invalid) {
      this.avenantForm.markAllAsTouched();
      this.toastr.warning('Veuillez remplir tous les champs requis.', 'Formulaire invalide');
      return;
    }

    const v = this.avenantForm.value;
    this.savingAvenant = true;
    const payload: Avenant = {
      contratId: this.contratId,
      objet: v.objet ?? '',
      description: v.description ?? '',
      dateCreation: new Date(),
      dateEffet: v.dateEffet ?? null,
    };

    this.contratService
      .creerAvenant(this.contratId, payload)
      .pipe(
        finalize(() => (this.savingAvenant = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Avenant créé avec succès.', 'Succès');
          this.avenantForm.reset({ objet: '', dateEffet: null, description: '' });
          this.showAvenantForm = false;
          this.reloadAvenants();
        },
        error: err => {
          console.error('Erreur création avenant :', err);
          this.toastr.error("Erreur lors de la création de l'avenant.", 'Erreur');
        },
      });
  }

  /** Recharge la liste des avenants depuis le backend (POST renvoie un body partiel). */
  private reloadAvenants(): void {
    this.contratService
      .getAvenants(this.contratId)
      .pipe(
        catchError(() => of([] as Avenant[])),
        takeUntil(this.destroy$),
      )
      .subscribe(avenants => (this.avenants = avenants));
  }

  supprimerAvenant(avenant: Avenant): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Êtes-vous sûr de vouloir supprimer l'avenant "${avenant.objet}" ? Cette action est irréversible.`,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(confirmed => {
        if (confirmed) {
          this.contratService
            .supprimerAvenant(this.contratId, avenant.id!)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.toastr.success('Avenant supprimé avec succès.', 'Succès');
                this.avenants = this.avenants.filter(a => a.id !== avenant.id);
              },
              error: err => {
                console.error('Erreur suppression avenant :', err);
                this.toastr.error("Erreur lors de la suppression de l'avenant.", 'Erreur');
              },
            });
        }
      });
  }

  // ─── Renouvellements ──────────────────────────────────────────────────────
  toggleRenouvellementForm(): void {
    this.showRenouvellementForm = !this.showRenouvellementForm;
    if (!this.showRenouvellementForm) {
      this.renouvellementForm.reset({ nouvelleDateFin: null, motif: '' });
    }
  }

  renouvelerContrat(): void {
    if (this.renouvellementForm.invalid) {
      this.renouvellementForm.markAllAsTouched();
      this.toastr.warning('Veuillez remplir tous les champs requis.', 'Formulaire invalide');
      return;
    }

    const v = this.renouvellementForm.value;
    this.savingRenouvellement = true;
    const payload: Renouvellement = {
      contratId: this.contratId,
      ancienneDateFin: this.contrat?.dateFin ?? null,
      nouvelleDateFin: v.nouvelleDateFin ?? null,
      dateRenouvellement: new Date(),
      motif: v.motif ?? '',
    };

    this.contratService
      .renouvelerContrat(this.contratId, payload)
      .pipe(
        finalize(() => (this.savingRenouvellement = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Contrat renouvelé avec succès.', 'Succès');
          this.renouvellementForm.reset({ nouvelleDateFin: null, motif: '' });
          this.showRenouvellementForm = false;
          this.reloadContratAndRenouvellements();
        },
        error: err => {
          console.error('Erreur renouvellement :', err);
          this.toastr.error('Erreur lors du renouvellement du contrat.', 'Erreur');
        },
      });
  }

  /** Recharge contrat + renouvellements depuis le backend (POST renvoie un body partiel). */
  private reloadContratAndRenouvellements(): void {
    forkJoin({
      contrat: this.contratService.getContratById(this.contratId).pipe(catchError(() => of(null))),
      renouvellements: this.contratService.getRenouvellements(this.contratId).pipe(catchError(() => of([] as Renouvellement[]))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ contrat, renouvellements }) => {
        if (contrat) this.contrat = contrat;
        this.renouvellements = renouvellements;
      });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  get peutRenouveler(): boolean {
    return this.contrat?.typeContrat === 'CDD' || this.contrat?.typeContrat === 'STAGE';
  }

  getTypeBadgeClasses(type: string): string {
    const map: Record<string, string> = {
      CDI: 'bg-blue-100 text-blue-700 border border-blue-200',
      CDD: 'bg-amber-100 text-amber-700 border border-amber-200',
      STAGE: 'bg-purple-100 text-purple-700 border border-purple-200',
      PRESTATION: 'bg-teal-100 text-teal-700 border border-teal-200',
    };
    return map[type] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  getStatutBadgeClasses(statut: string): string {
    const map: Record<string, string> = {
      ACTIF: 'bg-green-100 text-green-700 border border-green-200',
      EXPIRE: 'bg-red-100 text-red-700 border border-red-200',
      RENOUVELE: 'bg-blue-100 text-blue-700 border border-blue-200',
      RESILIE: 'bg-gray-100 text-gray-600 border border-gray-200',
    };
    return map[statut] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      ACTIF: 'Actif',
      EXPIRE: 'Expiré',
      RENOUVELE: 'Renouvelé',
      RESILIE: 'Résilié',
    };
    return map[statut] ?? statut;
  }

  retourListe(): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/contrats']);
  }

  // ─── Nettoyage ────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
