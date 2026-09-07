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
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { ParametresCongesService } from '../../../../../services/parametres-conges.service';
import {
  PARAMETRES_CONGES_DEFAUT,
  ParametresConges,
} from '../../../../../models/parametres-conges.model';

/**
 * Barème des droits à congés — RH > Congés > Paramètres.
 *
 * Trois règles y sont réglables : l'acquis de base (2 j ouvrables par mois de service
 * effectif), la majoration pour enfants de moins de N ans et les paliers d'ancienneté.
 * Les valeurs par défaut sont celles du droit du travail sénégalais ; l'écran existe
 * pour qu'une évolution réglementaire n'exige pas un déploiement.
 *
 * ⚠ **Le barème n'est pas versionné par date d'effet** : le modifier recalcule aussi les
 * exercices clos, donc le reliquat reporté. L'encart au-dessus d'« Enregistrer » le dit,
 * parce que ce n'est pas devinable depuis l'écran.
 *
 * ⚠ Le serveur applique un **patch** : n'envoyer que des champs renseignés. Les paliers,
 * eux, sont transmis en bloc — c'est le seul moyen d'en supprimer un.
 */
@Component({
  selector: 'app-parametres-conges',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './parametres-conges.component.html',
  styleUrl: './parametres-conges.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametresCongesComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  loading = false;
  enregistrement = false;
  derniereMaj: string | null = null;
  dernierAuteur: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private service: ParametresCongesService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      joursAcquisParMois: [PARAMETRES_CONGES_DEFAUT.joursAcquisParMois,
        [Validators.required, Validators.min(0)]],

      supplementEnfantsActif: [PARAMETRES_CONGES_DEFAUT.supplementEnfantsActif],
      joursParEnfant: [PARAMETRES_CONGES_DEFAUT.joursParEnfant,
        [Validators.required, Validators.min(0)]],
      ageMaxEnfant: [PARAMETRES_CONGES_DEFAUT.ageMaxEnfant,
        [Validators.required, Validators.min(0), Validators.max(30)]],
      reserverAuxMeres: [PARAMETRES_CONGES_DEFAUT.reserverAuxMeres],
      // Vide = aucun plafond. Une sentinelle négative est envoyée au serveur pour
      // effacer un plafond existant (« null = inchangé » l'en empêcherait).
      plafondJoursEnfants: [null as number | null, Validators.min(0)],

      supplementAncienneteActif: [PARAMETRES_CONGES_DEFAUT.supplementAncienneteActif],
      paliersAnciennete: this.fb.array([], this.ancienneteSansDoublonValidator),
    });

    this.appliquerValeurs(PARAMETRES_CONGES_DEFAUT);
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get paliers(): FormArray { return this.form.get('paliersAnciennete') as FormArray; }

  /**
   * Charge le barème réel.
   *
   * ⚠ **404 toléré** : aucun barème enregistré encore, on garde les défauts déjà
   * appliqués plutôt que d'afficher une erreur pour une base neuve. Toute autre erreur
   * est signalée — laisser croire que le barème légal affiché est celui en base serait
   * pire que l'absence d'écran.
   */
  private charger(): void {
    this.loading = true;
    this.service.charger()
      .pipe(
        finalize(() => { this.loading = false; this.cdr.markForCheck(); }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: bareme => {
          this.appliquerValeurs(bareme);
          this.derniereMaj = bareme.dateModification ?? null;
          this.dernierAuteur = bareme.modifieParNom ?? null;
        },
        error: err => {
          if (err?.status !== 404) {
            this.toastr.error('Le barème des congés n’a pas pu être chargé.');
          }
        },
      });
  }

  private appliquerValeurs(b: ParametresConges): void {
    this.form.patchValue({
      joursAcquisParMois: b.joursAcquisParMois,
      supplementEnfantsActif: b.supplementEnfantsActif,
      joursParEnfant: b.joursParEnfant,
      ageMaxEnfant: b.ageMaxEnfant,
      reserverAuxMeres: b.reserverAuxMeres,
      plafondJoursEnfants: b.plafondJoursEnfants ?? null,
      supplementAncienneteActif: b.supplementAncienneteActif,
    }, { emitEvent: false });

    this.paliers.clear({ emitEvent: false });
    [...(b.paliersAnciennete ?? [])]
      .sort((x, y) => x.anneesAnciennete - y.anneesAnciennete)
      .forEach(p => this.paliers.push(this.creerLignePalier(p.anneesAnciennete, p.joursSupplementaires),
        { emitEvent: false }));
    this.paliers.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  private creerLignePalier(annees: number | null, jours: number | null): FormGroup {
    return this.fb.group({
      anneesAnciennete: [annees, [Validators.required, Validators.min(1)]],
      joursSupplementaires: [jours, [Validators.required, Validators.min(0)]],
    });
  }

  ajouterPalier(): void {
    this.paliers.push(this.creerLignePalier(null, null));
    this.paliers.markAsTouched();
    this.cdr.markForCheck();
  }

  retirerPalier(i: number): void {
    this.paliers.removeAt(i);
    this.paliers.markAsTouched();
    this.cdr.markForCheck();
  }

  trackByIndex(i: number): number { return i; }

  /**
   * Deux paliers ne peuvent pas partager la même ancienneté : le calcul retient le
   * `max` des jours, l'un des deux serait donc silencieusement sans effet.
   */
  private ancienneteSansDoublonValidator(control: AbstractControl): ValidationErrors | null {
    const valeurs = (control as FormArray).controls
      .map(c => c.get('anneesAnciennete')?.value)
      .filter(v => v !== null && v !== '');
    return new Set(valeurs).size === valeurs.length ? null : { anciennetesDupliquees: true };
  }

  /** Repatch le barème légal **sans enregistrer** — l'utilisateur reste maître. */
  retablirBaremeLegal(): void {
    this.appliquerValeurs(PARAMETRES_CONGES_DEFAUT);
    this.form.markAsDirty();
    this.toastr.info('Barème légal appliqué au formulaire. Enregistrez pour le conserver.');
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    const v = this.form.value;
    const payload: Partial<ParametresConges> = {
      joursAcquisParMois: v.joursAcquisParMois,
      supplementEnfantsActif: v.supplementEnfantsActif,
      joursParEnfant: v.joursParEnfant,
      ageMaxEnfant: v.ageMaxEnfant,
      reserverAuxMeres: v.reserverAuxMeres,
      // Champ vidé ⇒ sentinelle négative, seul moyen d'effacer un plafond existant.
      plafondJoursEnfants: v.plafondJoursEnfants === null || v.plafondJoursEnfants === ''
        ? -1
        : v.plafondJoursEnfants,
      supplementAncienneteActif: v.supplementAncienneteActif,
      paliersAnciennete: v.paliersAnciennete,
    };

    this.enregistrement = true;
    this.service.modifierParametres(payload)
      .pipe(
        finalize(() => { this.enregistrement = false; this.cdr.markForCheck(); }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: bareme => {
          this.appliquerValeurs(bareme);
          this.derniereMaj = bareme.dateModification ?? null;
          this.dernierAuteur = bareme.modifieParNom ?? null;
          this.form.markAsPristine();
          this.toastr.success('Barème des congés enregistré.');
        },
        error: err => {
          this.toastr.error(
            err?.status === 403
              ? 'Action non autorisée pour votre profil.'
              : err?.error?.message ?? 'Le barème n’a pas pu être enregistré.',
          );
        },
      });
  }
}
