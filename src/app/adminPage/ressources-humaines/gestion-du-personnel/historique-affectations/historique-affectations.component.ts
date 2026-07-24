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
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { TerrainPlanningService } from '../../../../services/terrain-planning.service';
import {
  AffectationAgent,
  StatutAffectation,
} from '../../../../models/terrain-planning.model';
import {
  COULEURS_STATUT_AFFECTATION,
  LIBELLES_STATUT_AFFECTATION,
  ORDRE_STATUTS_AFFECTATION,
} from '../../../../constants/terrain.constants';
import { SelecteurAgentComponent } from '../../../exploitation-v2/terrain/shared/selecteur-agent/selecteur-agent.component';
import { SelecteurSiteComponent } from '../../../exploitation-v2/terrain/shared/selecteur-site/selecteur-site.component';

/** Valeur de l'onglet « Toutes » (aucun filtre de statut). */
type OngletStatut = StatutAffectation | '';

/**
 * Historique des affectations des employés — Module RH, 6.1 Gestion du
 * Personnel.
 *
 * Page de CONSULTATION EN LECTURE SEULE : elle réutilise l'historique des
 * affectations terrain (`AffectationAgent`) exposé par `TerrainPlanningService`
 * — aucune écriture (création / modification / annulation / suppression) et
 * aucun export. Filtrable par employé, site, statut et plage de dates.
 */
@Component({
  selector: 'app-historique-affectations',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    DatePipe,
    SelecteurAgentComponent,
    SelecteurSiteComponent,
  ],
  templateUrl: './historique-affectations.component.html',
  styleUrl: './historique-affectations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoriqueAffectationsComponent implements OnInit, OnDestroy {

  affectations: AffectationAgent[] = [];
  loading = false;

  page = 0;
  size = 20;
  totalElements = 0;
  totalPages = 0;

  employeIdControl = new FormControl<string | null>(null);
  siteIdControl = new FormControl<string | null>(null);
  dateDebutControl = new FormControl<string>('', { nonNullable: true });
  dateFinControl = new FormControl<string>('', { nonNullable: true });
  statutControl = new FormControl<OngletStatut>('', { nonNullable: true });

  readonly LIBELLES_STATUT = LIBELLES_STATUT_AFFECTATION;
  readonly COULEURS_STATUT = COULEURS_STATUT_AFFECTATION;
  readonly STATUTS = ORDRE_STATUTS_AFFECTATION;

  /** Compteurs des onglets, indexés par statut ('' = toutes). */
  compteurs: Record<OngletStatut, number> = this.compteursVides();

  private destroy$ = new Subject<void>();

  constructor(
    private service: TerrainPlanningService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Les filtres de périmètre (employé, site, dates) rechargent liste ET
    // compteurs pour que les onglets restent cohérents avec le périmètre.
    [
      this.employeIdControl,
      this.siteIdControl,
      this.dateDebutControl,
      this.dateFinControl,
    ].forEach((ctrl) =>
      ctrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.page = 0;
        this.charger();
        this.chargerCompteurs();
      }),
    );
    // Le changement d'onglet (statut) ne recharge que la liste.
    this.statutControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 0;
        this.charger();
      });
    this.charger();
    this.chargerCompteurs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    this.loading = true;
    this.service
      .listerAffectations(this.page, this.size, this.filtresPerimetre({
        statut: (this.statutControl.value || undefined) as StatutAffectation | undefined,
      }))
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
        error: () =>
          this.toastr.error("Impossible de charger l'historique des affectations."),
      });
  }

  /**
   * Recharge les compteurs des onglets : un appel par statut (+ « toutes »)
   * en `size = 1`, dont seul `totalElements` est exploité. Chaque appel
   * reprend les filtres de périmètre courants (employé, site, dates).
   */
  chargerCompteurs(): void {
    const onglets: OngletStatut[] = ['', ...this.STATUTS];

    forkJoin(
      onglets.map((statut) =>
        this.service.listerAffectations(
          0,
          1,
          this.filtresPerimetre({ statut: statut || undefined }),
        ),
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

  /** Construit le filtre commun (employé, site, dates) + le statut fourni. */
  private filtresPerimetre(extra: { statut?: StatutAffectation }) {
    return {
      dateDebut: this.dateDebutControl.value || undefined,
      dateFin: this.dateFinControl.value || undefined,
      employeId: this.employeIdControl.value || undefined,
      siteId: this.siteIdControl.value || undefined,
      statut: extra.statut,
    };
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
    // Un seul rechargement : les setValue préalables sont silencieux.
    this.employeIdControl.setValue(null, { emitEvent: false });
    this.siteIdControl.setValue(null, { emitEvent: false });
    this.dateDebutControl.setValue('', { emitEvent: false });
    this.dateFinControl.setValue('', { emitEvent: false });
    this.statutControl.setValue('', { emitEvent: false });
    this.page = 0;
    this.charger();
    this.chargerCompteurs();
  }

  trackById(_: number, a: AffectationAgent): string {
    return a.id ?? `${a.employeId}-${a.dateDebut}`;
  }
}
