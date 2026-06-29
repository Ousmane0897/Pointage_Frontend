import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2BonEntreeService } from '../../../../../services/stock-v2-bon-entree.service';
import {
  BonEntree,
  BonEntreePayload,
  TypeEntree,
} from '../../../../../models/stock-v2-bon-entree.model';
import { SelecteurSiteComponent } from '../../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import { SelecteurEmployeComponent } from '../../shared/selecteur-employe/selecteur-employe.component';
import {
  EditeurLignesBonComponent,
  creerLigneBon,
} from '../../shared/editeur-lignes-bon/editeur-lignes-bon.component';
import {
  LIBELLES_TYPE_ENTREE,
  ORDRE_TYPES_ENTREE,
} from '../../../../../constants/stock.constants';

/**
 * Formulaire de bon d'entrée — Module Stock v2 / 7.4 (fonctionnalité 4).
 *
 * Création / édition d'un brouillon (les bons non-BROUILLON ne sont pas
 * éditables). Le bon est créé à l'état BROUILLON puis soumis depuis la fiche.
 */
@Component({
  selector: 'app-formulaire-bon-entree',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    SelecteurSiteComponent,
    SelecteurEmployeComponent,
    EditeurLignesBonComponent,
  ],
  templateUrl: './formulaire-bon-entree.component.html',
  styleUrl: './formulaire-bon-entree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaireBonEntreeComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  submitting = false;
  chargement = false;
  idEdition: string | null = null;

  readonly LIBELLES_TYPE_ENTREE = LIBELLES_TYPE_ENTREE;
  readonly TYPES = ORDRE_TYPES_ENTREE;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private service: StockV2BonEntreeService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      type: ['ACHAT_FOURNISSEUR' as TypeEntree, Validators.required],
      date: [this.aujourdhui(), Validators.required],
      siteDestinationId: ['', Validators.required],
      fournisseur: [''],
      referenceCommande: [''],
      demandeurId: [''],
      commentaire: [''],
      lignes: this.fb.array([]),
    });

    this.idEdition = this.route.snapshot.paramMap.get('id');
    if (this.idEdition) {
      this.chargerBon(this.idEdition);
    } else {
      this.lignes.push(creerLigneBon());
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get lignes(): FormArray { return this.form.get('lignes') as FormArray; }

  private chargerBon(id: string): void {
    this.chargement = true;
    this.service.getById(id)
      .pipe(finalize(() => { this.chargement = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: bon => {
          if (bon.statut !== 'BROUILLON') {
            this.toastr.warning('Seuls les brouillons sont modifiables.');
            this.router.navigate(['/admin/stock-v2/controle-mouvements/bons-entree', id]);
            return;
          }
          this.remplir(bon);
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastr.error('Bon introuvable.');
          this.router.navigate(['/admin/stock-v2/controle-mouvements/bons-entree']);
        },
      });
  }

  private remplir(bon: BonEntree): void {
    this.form.patchValue({
      type: bon.type,
      date: (bon.date ?? '').substring(0, 10),
      siteDestinationId: bon.siteDestinationId,
      fournisseur: bon.fournisseur ?? '',
      referenceCommande: bon.referenceCommande ?? '',
      demandeurId: bon.demandeurId ?? '',
      commentaire: bon.commentaire ?? '',
    });
    this.lignes.clear();
    (bon.lignes ?? []).forEach(l => this.lignes.push(creerLigneBon({
      produitId: l.produitId,
      produitCode: l.produitCode,
      produitLibelle: l.produitLibelle,
      unite: l.unite,
      prixUnitaire: l.prixUnitaire ?? null,
      quantite: l.quantite,
    })));
    if (this.lignes.length === 0) this.lignes.push(creerLigneBon());
  }

  enregistrer(): void {
    if (this.form.invalid || this.lignes.length === 0) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez compléter les champs obligatoires et ajouter au moins une ligne.');
      return;
    }
    const v = this.form.getRawValue();
    const payload: BonEntreePayload = {
      type: v.type,
      date: v.date,
      siteDestinationId: v.siteDestinationId,
      fournisseur: v.fournisseur || undefined,
      referenceCommande: v.referenceCommande || undefined,
      demandeurId: v.demandeurId || undefined,
      commentaire: v.commentaire || undefined,
      lignes: (v.lignes as { produitId: string; quantite: number }[])
        .map(l => ({ produitId: l.produitId, quantite: l.quantite })),
    };

    this.submitting = true;
    const obs = this.idEdition
      ? this.service.modifier(this.idEdition, payload)
      : this.service.creer(payload);

    obs.pipe(finalize(() => { this.submitting = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: bon => {
          this.toastr.success(this.idEdition ? 'Bon mis à jour.' : 'Bon créé (brouillon).');
          this.router.navigate(['/admin/stock-v2/controle-mouvements/bons-entree', bon.id]);
        },
        error: () => this.toastr.error("Erreur lors de l'enregistrement du bon."),
      });
  }

  annuler(): void {
    this.router.navigate(['/admin/stock-v2/controle-mouvements/bons-entree']);
  }

  get f() { return this.form.controls as { [key: string]: any }; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
