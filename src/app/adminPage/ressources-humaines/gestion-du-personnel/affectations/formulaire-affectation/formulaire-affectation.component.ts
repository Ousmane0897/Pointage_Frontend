import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  finalize,
  switchMap,
  takeUntil,
} from 'rxjs/operators';

import { TerrainPlanningService } from '../../../../../services/terrain-planning.service';
import { TerrainSiteClientService } from '../../../../../services/terrain-site-client.service';
import { SiteClient } from '../../../../../models/terrain-site-client.model';
import {
  AffectationAgent,
  ConflitAffectation,
  StatutAffectation,
} from '../../../../../models/terrain-planning.model';
import {
  AffectationSite,
  DossierEmploye,
  libelleJoursTravail,
} from '../../../../../models/dossier-employe.model';
import {
  COULEURS_STATUT_AFFECTATION,
  LIBELLES_STATUT_AFFECTATION,
  ORDRE_STATUTS_AFFECTATION,
  STATUTS_AFFECTATION_MODIFIABLES,
} from '../../../../../constants/terrain.constants';
import { SelecteurAgentComponent } from '../../../../exploitation-v2/terrain/shared/selecteur-agent/selecteur-agent.component';
import { SelecteurSiteComponent } from '../../../../exploitation-v2/terrain/shared/selecteur-site/selecteur-site.component';

/**
 * Création / édition d'une affectation agent → site.
 *
 * - Pré-remplissage possible via query params `dateDebut` / `dateFin`
 *   (déclenché par la sélection d'un créneau dans le calendrier).
 * - Détection inline des conflits : à chaque changement d'agent ou de
 *   dates, on interroge `detecterConflits` filtré sur la fenêtre, et on
 *   affiche un avertissement si l'agent a une autre affectation qui se
 *   chevauche.
 */
@Component({
  selector: 'app-formulaire-affectation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    SelecteurAgentComponent,
    SelecteurSiteComponent,
  ],
  templateUrl: './formulaire-affectation.component.html',
  styleUrl: './formulaire-affectation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaireAffectationComponent implements OnInit, OnDestroy {

  affectationId: string | null = null;
  form!: FormGroup;
  loading = false;
  submitting = false;

  conflits: ConflitAffectation[] = [];
  verificationConflits = false;

  /** Site sélectionné (objet complet) — pour libeller les messages de plafond. */
  siteCourant: SiteClient | null = null;

  /**
   * Agent sélectionné (objet complet, émis par `app-selecteur-agent`) — alimente
   * la section « Affectation actuelle » : poste, site(s) et horaires de base.
   */
  agentCourant: DossierEmploye | null = null;

  readonly LIBELLES_STATUT = LIBELLES_STATUT_AFFECTATION;
  readonly COULEURS_STATUT = COULEURS_STATUT_AFFECTATION;
  readonly STATUTS = ORDRE_STATUTS_AFFECTATION;

  private destroy$ = new Subject<void>();
  private verifConflitTrigger$ = new Subject<void>();
  private verifCapaciteTrigger$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private service: TerrainPlanningService,
    private siteService: TerrainSiteClientService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.affectationId = this.route.snapshot.paramMap.get('id');
    this.initForm();

    // Pré-remplissage depuis le calendrier (?dateDebut=...&dateFin=...)
    if (!this.affectationId) {
      const qp = this.route.snapshot.queryParamMap;
      const debut = qp.get('dateDebut');
      const fin = qp.get('dateFin');
      if (debut) this.form.get('dateDebut')!.setValue(this.versInputDateTime(debut));
      if (fin) this.form.get('dateFin')!.setValue(this.versInputDateTime(fin));
    }

    if (this.affectationId) {
      this.charger(this.affectationId);
    }

    this.surveillerChangements();
    this.brancherVerificationConflits();
    this.brancherVerificationCapacite();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Init / chargement ────────────────────────────────────────────────────

  private initForm(): void {
    this.form = this.fb.group(
      {
        employeId: [null, Validators.required],
        siteId: [null, Validators.required],
        dateDebut: ['', Validators.required],
        // Optionnelle : une affectation sans fin est à durée indéterminée.
        dateFin: [''],
        statut: ['PLANIFIEE' as StatutAffectation, Validators.required],
        commentaire: [''],
        remplaceAffectationId: [null],
        motifRemplacement: [''],
      },
      { validators: [this.bornesDatesValidator] },
    );
  }

  private charger(id: string): void {
    this.loading = true;
    this.service
      .getAffectation(id)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (a) => {
          // Une affectation figée (EFFECTUEE / ANNULEE / REMPLACEE) n'est pas modifiable :
          // on bloque l'accès direct par URL et on renvoie vers la fiche.
          if (!STATUTS_AFFECTATION_MODIFIABLES.includes(a.statut)) {
            this.toastr.error('Cette affectation ne peut plus être modifiée.');
            this.router.navigate([
              '/admin/rh/gestion-du-personnel/affectations',
              id,
            ]);
            return;
          }
          this.form.patchValue({
            employeId: a.employeId,
            siteId: a.siteId,
            dateDebut: this.versInputDateTime(a.dateDebut),
            dateFin: a.dateFin ? this.versInputDateTime(a.dateFin) : '',
            statut: a.statut,
            commentaire: a.commentaire ?? '',
            remplaceAffectationId: a.remplaceAffectationId ?? null,
            motifRemplacement: a.motifRemplacement ?? '',
          });
          // `writeValue` du sélecteur n'émet pas `siteSelectionne` : on récupère le
          // site complet pour disposer de son nom dans les messages de plafond.
          if (a.siteId) {
            this.siteService
              .getById(a.siteId)
              .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
              .subscribe((site) => {
                this.siteCourant = site;
                this.cdr.markForCheck();
              });
          }
        },
        error: () => {
          this.toastr.error('Affectation introuvable.');
          this.router.navigate(['/admin/rh/gestion-du-personnel/affectations']);
        },
      });
  }

  // ─── Validation des dates ────────────────────────────────────────────────

  private bornesDatesValidator(ctrl: AbstractControl): ValidationErrors | null {
    const debut = ctrl.get('dateDebut')?.value as string;
    const fin = ctrl.get('dateFin')?.value as string;
    if (!debut || !fin) return null;
    if (new Date(fin).getTime() <= new Date(debut).getTime()) {
      return { datesInvalides: true };
    }
    return null;
  }

  // ─── Détection conflits ──────────────────────────────────────────────────

  private surveillerChangements(): void {
    ['employeId', 'dateDebut', 'dateFin'].forEach((nom) => {
      this.form.get(nom)?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.verifConflitTrigger$.next());
    });
    // Le plafond du site ne dépend que du site choisi (comptage « toutes affectations actives »).
    this.form.get('siteId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.verifCapaciteTrigger$.next());
  }

  /** Capture l'objet site complet émis par le sélecteur (pour le nom dans les messages). */
  onSiteSelectionne(site: SiteClient | null): void {
    this.siteCourant = site;
  }

  /**
   * Capture l'objet agent complet émis par le sélecteur — alimente la section
   * « Affectation actuelle ». Émis aussi bien à la sélection manuelle qu'au
   * chargement d'une affectation existante (mode édition).
   */
  onAgentSelectionne(agent: DossierEmploye | null): void {
    this.agentCourant = agent;
    this.cdr.markForCheck();
  }

  /** Sites et horaires de base de l'agent (fiche employé RH). */
  affectationsAgent(): AffectationSite[] {
    return this.agentCourant?.affectations ?? [];
  }

  /**
   * Libellé des jours travaillés sur un site donné (défaut : Lundi - Vendredi).
   * La semaine ouvrée est propre à chaque affectation, d'où le paramètre.
   */
  libelleJoursTravail(a: AffectationSite): string {
    return libelleJoursTravail(a.joursTravail);
  }

  /**
   * Vérification réactive du plafond du site à chaque changement de site : toast
   * d'information si sous le plafond, avertissement si déjà atteint. Le blocage dur
   * reste dans `soumettre()` (autorité finale à la persistance).
   */
  private brancherVerificationCapacite(): void {
    this.verifCapaciteTrigger$
      .pipe(
        debounceTime(400),
        switchMap(() => {
          const siteId = this.form.get('siteId')!.value as string | null;
          if (!siteId) return of(null);
          return this.siteService
            .compterEffectif(siteId, 'TERRAIN', {
              excludeAffectationId: this.affectationId ?? undefined,
            })
            .pipe(catchError(() => of(null)));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((eff) => {
        if (!eff || eff.nombreMax == null) return;
        const nom = this.siteCourant?.nom ?? 'ce site';
        if (eff.nombreActuel >= eff.nombreMax) {
          this.toastr.error(`Le nombre maximum d'employé pour ${nom} est atteint`);
          return;
        }
        this.toastr.info(`Le site possède actuellement ${eff.nombreActuel + 1} / ${eff.nombreMax}.`);
      });
  }

  private brancherVerificationConflits(): void {
    this.verifConflitTrigger$
      .pipe(
        debounceTime(400),
        switchMap(() => {
          const employeId = this.form.get('employeId')!.value as string | null;
          const dateDebut = this.form.get('dateDebut')!.value as string;
          const dateFin = this.form.get('dateFin')!.value as string;
          if (!employeId || !dateDebut || !dateFin) {
            this.conflits = [];
            this.cdr.markForCheck();
            return of([] as ConflitAffectation[]);
          }
          if (this.form.errors?.['datesInvalides']) {
            this.conflits = [];
            this.cdr.markForCheck();
            return of([] as ConflitAffectation[]);
          }
          this.verificationConflits = true;
          this.cdr.markForCheck();
          return this.service
            .detecterConflits(
              new Date(dateDebut).toISOString(),
              new Date(dateFin).toISOString(),
            )
            .pipe(catchError(() => of([] as ConflitAffectation[])));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((conflits) => {
        const employeId = this.form.get('employeId')!.value as string | null;
        // On ne garde que les conflits qui concernent CET agent et excluent
        // l'affectation en cours d'édition.
        this.conflits = conflits
          .filter((c) => c.employeId === employeId)
          .map((c) => ({
            ...c,
            affectations: c.affectations.filter(
              (aff) => aff.id !== this.affectationId,
            ),
          }))
          .filter((c) => c.affectations.length > 0);
        this.verificationConflits = false;
        this.cdr.markForCheck();
      });
  }

  // ─── Soumission ──────────────────────────────────────────────────────────

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.error('Veuillez corriger les champs invalides.');
      return;
    }

    const v = this.form.value as {
      employeId: string;
      siteId: string;
      dateDebut: string;
      dateFin: string;
      statut: StatutAffectation;
      commentaire: string;
      remplaceAffectationId: string | null;
      motifRemplacement: string;
    };

    const payload: AffectationAgent = {
      employeId: v.employeId,
      siteId: v.siteId,
      dateDebut: new Date(v.dateDebut).toISOString(),
      dateFin: v.dateFin ? new Date(v.dateFin).toISOString() : undefined,
      statut: v.statut,
      commentaire: v.commentaire || undefined,
      remplaceAffectationId: v.remplaceAffectationId || undefined,
      motifRemplacement: v.motifRemplacement || undefined,
    };

    this.submitting = true;
    // Garde bloquante : le plafond du site est vérifié juste avant la persistance.
    this.siteService
      .compterEffectif(v.siteId, 'TERRAIN', {
        excludeAffectationId: this.affectationId ?? undefined,
      })
      .pipe(
        catchError(() => of(null)),
        switchMap((eff) => {
          if (eff && eff.nombreMax != null && eff.nombreActuel >= eff.nombreMax) {
            const nom = this.siteCourant?.nom ?? 'ce site';
            this.toastr.error(`Le nombre maximum d'employé pour ${nom} est atteint`);
            return of(null);
          }
          return this.affectationId
            ? this.service.modifierAffectation(this.affectationId, payload)
            : this.service.creerAffectation(payload);
        }),
        finalize(() => {
          this.submitting = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (a) => {
          if (!a) return; // bloqué par le plafond
          this.toastr.success(
            this.affectationId ? 'Affectation modifiée.' : 'Affectation créée.',
          );
          this.router.navigate([
            '/admin/rh/gestion-du-personnel/affectations',
            a.id ?? this.affectationId,
          ]);
        },
        error: (err) => {
          const message =
            err?.error?.message ||
            (this.affectationId ? 'Modification impossible.' : 'Création impossible.');
          this.toastr.error(message);
        },
      });
  }

  annuler(): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/affectations']);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Convertit une ISO `2026-05-26T08:00:00Z` → `2026-05-26T08:00` pour `<input type="datetime-local">`. */
  private versInputDateTime(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  estEdition(): boolean {
    return this.affectationId !== null;
  }
}
