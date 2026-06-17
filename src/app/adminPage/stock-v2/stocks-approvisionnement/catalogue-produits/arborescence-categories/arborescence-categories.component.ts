import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2CategorieService } from '../../../../../services/stock-v2-categorie.service';
import {
  CategorieStock,
  NoeudCategorie,
  CategoriePayload,
} from '../../../../../models/stock-v2-categorie.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-arborescence-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './arborescence-categories.component.html',
  styleUrl: './arborescence-categories.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArborescenceCategoriesComponent implements OnInit, OnDestroy {

  racines: NoeudCategorie[] = [];
  loading = false;

  // Panneau d'édition
  panneauOuvert = false;
  editionId: string | null = null;
  parentCible: NoeudCategorie | null = null;   // null = racine
  form!: FormGroup;
  submitting = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private service: StockV2CategorieService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      libelle: ['', [Validators.required, Validators.maxLength(80)]],
      description: [''],
    });
    this.chargerRacines();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private chargerRacines(): void {
    this.loading = true;
    this.service.listerRacines()
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: cats => { this.racines = (cats ?? []).map(c => this.enNoeud(c)); this.cdr.markForCheck(); },
        error: () => this.toastr.error('Impossible de charger les catégories.'),
      });
  }

  private enNoeud(c: CategorieStock): NoeudCategorie {
    return { ...c, enfants: [], charge: false, deplie: false, chargement: false };
  }

  basculer(noeud: NoeudCategorie): void {
    if (noeud.deplie) {
      noeud.deplie = false;
      this.cdr.markForCheck();
      return;
    }
    noeud.deplie = true;
    if (noeud.charge || !noeud.id) { this.cdr.markForCheck(); return; }
    noeud.chargement = true;
    this.service.listerEnfants(noeud.id)
      .pipe(finalize(() => { noeud.chargement = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: enfants => { noeud.enfants = (enfants ?? []).map(c => this.enNoeud(c)); noeud.charge = true; this.cdr.markForCheck(); },
        error: () => this.toastr.error('Impossible de charger les sous-catégories.'),
      });
  }

  // ─── Panneau création / édition ───────────────────────────────────────────

  nouvelleRacine(): void {
    this.parentCible = null;
    this.editionId = null;
    this.form.reset({ libelle: '', description: '' });
    this.panneauOuvert = true;
    this.cdr.markForCheck();
  }

  nouvelleSousCategorie(parent: NoeudCategorie): void {
    this.parentCible = parent;
    this.editionId = null;
    this.form.reset({ libelle: '', description: '' });
    this.panneauOuvert = true;
    this.cdr.markForCheck();
  }

  editer(noeud: NoeudCategorie): void {
    this.parentCible = null;
    this.editionId = noeud.id ?? null;
    this.form.reset({ libelle: noeud.libelle, description: noeud.description ?? '' });
    this.panneauOuvert = true;
    this.cdr.markForCheck();
  }

  fermerPanneau(): void {
    this.panneauOuvert = false;
    this.cdr.markForCheck();
  }

  enregistrer(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const payload: CategoriePayload = {
      libelle: this.form.value.libelle,
      description: this.form.value.description || undefined,
      parentId: this.editionId ? undefined : (this.parentCible?.id ?? null),
    };
    this.submitting = true;
    const op$ = this.editionId
      ? this.service.modifier(this.editionId, payload)
      : this.service.creer(payload);

    op$.pipe(
      finalize(() => { this.submitting = false; this.cdr.markForCheck(); }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: () => {
        this.toastr.success(this.editionId ? 'Catégorie modifiée.' : 'Catégorie créée.');
        this.panneauOuvert = false;
        // Recharge le périmètre concerné
        if (this.parentCible) {
          this.parentCible.charge = false;
          this.parentCible.deplie = false;
          this.basculer(this.parentCible);
        } else {
          this.chargerRacines();
        }
      },
      error: () => this.toastr.error("Erreur lors de l'enregistrement de la catégorie."),
    });
  }

  supprimer(noeud: NoeudCategorie): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Supprimer la catégorie « ${noeud.libelle} » ?\nLes sous-catégories et l'affectation des produits seront impactées.`,
        confirmLabel: 'Supprimer',
        confirmColor: 'warn',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok || !noeud.id) return;
      this.service.supprimer(noeud.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.toastr.success('Catégorie supprimée.'); this.chargerRacines(); },
        error: () => this.toastr.error('Suppression impossible (catégorie non vide ?).'),
      });
    });
  }

  trackById(_: number, n: NoeudCategorie): string {
    return n.id ?? n.libelle;
  }
}
