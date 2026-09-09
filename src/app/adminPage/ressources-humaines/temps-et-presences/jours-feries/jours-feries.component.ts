import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, finalize, takeUntil } from 'rxjs';

import { JourFerieService } from '../../../../services/jour-ferie.service';
import { JourFerie, JourFeriePayload } from '../../../../models/jour-ferie.model';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';

/**
 * Calendrier des jours fériés — saisie RH, année par année.
 *
 * ⚠ Cet écran est **volontairement dépourvu de toute liste en dur** : au Sénégal, Korité,
 * Tabaski, Tamkharit et Maouloud sont mobiles et annoncées à quelques jours. Le bouton
 * « Reprendre l'année précédente » ne reporte que les fériés **à date fixe** (drapeau
 * `recurrent`), les autres restant à saisir — c'est le serveur qui applique cette règle.
 *
 * ⚠ Les dates circulent en **chaînes `yyyy-MM-dd`**, jamais en `Date` : `toISOString()`
 * décalerait d'un jour selon le fuseau (même piège que les affectations et les congés).
 */
@Component({
  selector: 'app-jours-feries',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './jours-feries.component.html',
})
export class JoursFeriesComponent implements OnInit, OnDestroy {

  feries: JourFerie[] = [];
  annee = new Date().getFullYear();
  annees: number[] = [];

  loading = false;
  /** Erreur de chargement, rendue **dans la page** : ne pas masquer un calendrier vide
   *  derrière un état « aucun férié », qui se lirait comme une saisie à faire. */
  erreur = '';
  enregistrement = false;

  /** `null` = modale fermée ; sinon le férié en cours d'édition (`id` absent = création). */
  edite: JourFerie | null = null;
  form: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private service: JourFerieService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private toastr: ToastrService,
  ) {
    const courante = new Date().getFullYear();
    this.annees = [courante - 1, courante, courante + 1, courante + 2];
    this.form = this.fb.group({
      date: ['', Validators.required],
      libelle: ['', [Validators.required, Validators.maxLength(80)]],
      chome: [true],
      recurrent: [false],
    });
  }

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    this.loading = true;
    this.erreur = '';
    this.service.charger(this.annee).pipe(
      finalize(() => (this.loading = false)),
      takeUntil(this.destroy$),
    ).subscribe({
      next: feries => (this.feries = feries),
      error: err => {
        this.feries = [];
        this.erreur = err?.error?.message
          ?? "Le calendrier des jours fériés n'a pas pu être chargé.";
      },
    });
  }

  changerAnnee(valeur: string): void {
    this.annee = Number(valeur);
    this.charger();
  }

  // --- Saisie -------------------------------------------------------------

  ouvrirCreation(): void {
    this.edite = { date: '', libelle: '' };
    this.form.reset({ date: '', libelle: '', chome: true, recurrent: false });
  }

  ouvrirEdition(f: JourFerie): void {
    this.edite = f;
    this.form.reset({
      date: f.date.slice(0, 10),
      libelle: f.libelle,
      chome: f.chome ?? true,
      recurrent: f.recurrent ?? false,
    });
  }

  fermer(): void {
    this.edite = null;
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.value as JourFeriePayload;
    const id = this.edite?.id;

    this.enregistrement = true;
    const appel = id ? this.service.modifier(id, payload) : this.service.creer(payload);
    appel.pipe(
      finalize(() => (this.enregistrement = false)),
      takeUntil(this.destroy$),
    ).subscribe({
      next: () => {
        this.toastr.success(id ? 'Jour férié modifié.' : 'Jour férié ajouté.');
        this.fermer();
        this.charger();
      },
      // Le 409 « date déjà prise » et le 403 « profil non habilité » portent tous deux un
      // message serveur exploitable : l'afficher tel quel plutôt qu'un libellé générique.
      error: err => this.toastr.error(
        err?.error?.message ?? "L'enregistrement du jour férié a échoué."),
    });
  }

  supprimer(f: JourFerie): void {
    if (!f.id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        message: `Retirer « ${f.libelle} » du ${this.formaterDate(f.date)} ? `
          + 'Ce jour redeviendra un jour ouvrable dans les récapitulatifs et les congés.',
      },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirme => {
      if (!confirme) return;
      this.service.supprimer(f.id!).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.toastr.success('Jour férié supprimé.'); this.charger(); },
        error: err => this.toastr.error(
          err?.error?.message ?? 'La suppression a échoué.'),
      });
    });
  }

  /**
   * Reprend les fériés à date fixe de l'année précédente. Une réponse vide n'est **pas**
   * un échec : elle signifie que tout était déjà en place (l'opération est idempotente).
   */
  dupliquerAnneePrecedente(): void {
    const source = this.annee - 1;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      data: {
        message: `Reprendre les jours fériés à date fixe de ${source} vers ${this.annee} ? `
          + 'Les fêtes mobiles (Korité, Tabaski, Tamkharit, Maouloud) ne sont pas reportées '
          + 'et restent à saisir. Les dates déjà enregistrées ne seront pas modifiées.',
      },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirme => {
      if (!confirme) return;
      this.service.dupliquerAnnee(source, this.annee).pipe(takeUntil(this.destroy$)).subscribe({
        next: crees => {
          this.toastr.success(crees.length
            ? `${crees.length} jour(s) férié(s) repris de ${source}.`
            : `Aucun nouveau jour à reprendre : ${this.annee} est déjà à jour.`);
          this.charger();
        },
        error: err => this.toastr.error(
          err?.error?.message ?? 'La reprise de l’année précédente a échoué.'),
      });
    });
  }

  // --- Affichage ----------------------------------------------------------

  /** `yyyy-MM-dd` → « lundi 4 avril 2026 », sans passer par un `Date` UTC. */
  formaterDate(iso: string): string {
    const [a, m, j] = iso.slice(0, 10).split('-').map(Number);
    return new Date(a, m - 1, j).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  get nbChomes(): number {
    return this.feries.filter(f => f.chome !== false).length;
  }

  get nbMobiles(): number {
    return this.feries.filter(f => !f.recurrent).length;
  }

  trackById(_: number, f: JourFerie): string {
    return f.id ?? f.date;
  }
}
