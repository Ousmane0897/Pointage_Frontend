import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, interval, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { TerrainPlanningService } from '../../../../../services/terrain-planning.service';
import {
  AffectationAgent,
  StatutAffectation,
} from '../../../../../models/terrain-planning.model';
import {
  COULEURS_STATUT_AFFECTATION,
  INTERVALLE_RAFRAICHISSEMENT_PLANNING_MS,
  LIBELLES_STATUT_AFFECTATION,
  ORDRE_STATUTS_AFFECTATION,
  STATUTS_AFFECTATION_ANNULABLES,
  STATUTS_AFFECTATION_MODIFIABLES,
} from '../../../../../constants/terrain.constants';
import {
  AnnulerAffectationDialogComponent,
  AnnulerAffectationDialogResult,
} from '../dialogs/annuler-affectation-dialog.component';

/** Valeur de l'onglet « Toutes » (aucun filtre de statut). */
type OngletStatut = StatutAffectation | '';

@Component({
  selector: 'app-liste-affectations',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    DatePipe,
  ],
  templateUrl: './liste-affectations.component.html',
  styleUrl: './liste-affectations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListeAffectationsComponent implements OnInit, OnDestroy {

  affectations: AffectationAgent[] = [];
  loading = false;

  page = 0;
  size = 20;
  totalElements = 0;
  totalPages = 0;

  dateDebutControl = new FormControl<string>('', { nonNullable: true });
  dateFinControl = new FormControl<string>('', { nonNullable: true });
  statutControl = new FormControl<OngletStatut>('', { nonNullable: true });

  readonly LIBELLES_STATUT = LIBELLES_STATUT_AFFECTATION;
  readonly COULEURS_STATUT = COULEURS_STATUT_AFFECTATION;
  readonly STATUTS = ORDRE_STATUTS_AFFECTATION;
  readonly STATUTS_ANNULABLES = STATUTS_AFFECTATION_ANNULABLES;
  readonly STATUTS_MODIFIABLES = STATUTS_AFFECTATION_MODIFIABLES;

  /** Compteurs des onglets, indexés par statut ('' = toutes). */
  compteurs: Record<OngletStatut, number> = this.compteursVides();

  private destroy$ = new Subject<void>();

  constructor(
    private service: TerrainPlanningService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Les dates changent le périmètre : liste ET compteurs sont rechargés.
    [this.dateDebutControl, this.dateFinControl].forEach((ctrl) =>
      ctrl.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.page = 0;
          this.charger();
          this.chargerCompteurs();
        }),
    );
    // Le changement d'onglet ne recharge que la liste.
    this.statutControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 0;
        this.charger();
      });
    // Rafraîchissement auto : la bascule des statuts est faite côté serveur (cron 1 min),
    // ce polling la fait apparaître sans rechargement de la page.
    interval(INTERVALLE_RAFRAICHISSEMENT_PLANNING_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (document.hidden) return; // pas de requêtes en onglet masqué
        this.charger(true); // liste courante, sans spinner
        this.chargerCompteurs();
      });

    this.charger();
    this.chargerCompteurs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(silencieux = false): void {
    if (!silencieux) this.loading = true;
    this.service
      .listerAffectations(this.page, this.size, {
        dateDebut: this.dateDebutControl.value || undefined,
        dateFin: this.dateFinControl.value || undefined,
        statut: (this.statutControl.value || undefined) as StatutAffectation | undefined,
      })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res) => {
          this.affectations = res.content;
          this.totalElements = res.totalElements;
          this.totalPages = Math.max(1, Math.ceil(res.totalElements / this.size));
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de charger les affectations.'),
      });
  }

  /**
   * Recharge les compteurs des onglets : un appel par statut (+ « toutes »)
   * en `size = 1`, dont seul `totalElements` est exploité.
   */
  chargerCompteurs(): void {
    const filtresDates = {
      dateDebut: this.dateDebutControl.value || undefined,
      dateFin: this.dateFinControl.value || undefined,
    };
    const onglets: OngletStatut[] = ['', ...this.STATUTS];

    forkJoin(
      onglets.map((statut) =>
        this.service.listerAffectations(0, 1, {
          ...filtresDates,
          statut: statut || undefined,
        }),
      ),
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reponses) => {
          const compteurs = this.compteursVides();
          onglets.forEach((statut, i) => {
            compteurs[statut] = reponses[i].totalElements;
          });
          this.compteurs = compteurs;
          this.cdr.markForCheck();
        },
        // Échec silencieux : les compteurs sont informatifs, la liste reste utilisable.
        error: () => {
          this.compteurs = this.compteursVides();
          this.cdr.markForCheck();
        },
      });
  }

  choisirStatut(statut: OngletStatut): void {
    if (this.statutControl.value === statut) return;
    this.statutControl.setValue(statut);
  }

  private compteursVides(): Record<OngletStatut, number> {
    return {
      '': 0,
      PLANIFIEE: 0,
      EN_COURS: 0,
      EFFECTUEE: 0,
      ANNULEE: 0,
      REMPLACEE: 0,
    };
  }

  pagePrecedente(): void {
    if (this.page > 0) {
      this.page--;
      this.charger();
    }
  }

  pageSuivante(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.charger();
    }
  }

  resetFiltres(): void {
    // Un seul rechargement : les deux premiers setValue sont silencieux.
    this.dateDebutControl.setValue('', { emitEvent: false });
    this.dateFinControl.setValue('', { emitEvent: false });
    this.statutControl.setValue('', { emitEvent: false });
    this.page = 0;
    this.charger();
    this.chargerCompteurs();
  }

  estAnnulable(a: AffectationAgent): boolean {
    return !!a.id && this.STATUTS_ANNULABLES.includes(a.statut);
  }

  estModifiable(a: AffectationAgent): boolean {
    return !!a.id && this.STATUTS_MODIFIABLES.includes(a.statut);
  }

  annuler(a: AffectationAgent): void {
    if (!this.estAnnulable(a) || !a.id) return;
    const id = a.id;
    this.dialog
      .open(AnnulerAffectationDialogComponent, {
        width: '480px',
        data: {
          employeNom: a.employeNom ?? a.employeMatricule,
          siteNom: a.siteNom ?? a.siteCode,
          creneau: this.creneauLisible(a),
        },
      })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: AnnulerAffectationDialogResult | null | undefined) => {
        if (!res) return;
        this.service
          .annulerAffectation(id, res.motif)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success('Affectation annulée.');
              this.charger();
              this.chargerCompteurs();
            },
            error: (err) =>
              this.toastr.error(
                err?.status === 409 || err?.status === 422
                  ? "Cette affectation n'est plus annulable."
                  : "L'annulation a échoué.",
              ),
          });
      });
  }

  private creneauLisible(a: AffectationAgent): string {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    return `${fmt(a.dateDebut)} → ${a.dateFin ? fmt(a.dateFin) : 'indéterminée'}`;
  }

  trackById(_: number, a: AffectationAgent): string {
    return a.id ?? `${a.employeId}-${a.dateDebut}`;
  }
}
