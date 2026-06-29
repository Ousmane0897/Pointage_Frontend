import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2InventaireService } from '../../../../../services/stock-v2-inventaire.service';
import { StockV2CategorieService } from '../../../../../services/stock-v2-categorie.service';
import {
  InventairePayload,
  PerimetreInventaire,
} from '../../../../../models/stock-v2-inventaire.model';
import { Produit } from '../../../../../models/stock-v2-produit.model';
import { CategorieStock } from '../../../../../models/stock-v2-categorie.model';
import { SelecteurSiteComponent } from '../../shared/selecteur-site/selecteur-site.component';
import { SelecteurProduitComponent } from '../../shared/selecteur-produit/selecteur-produit.component';
import { PARAMETRES_STOCK } from '../../../../../constants/stock.constants';

@Component({
  selector: 'app-planification-inventaire',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    SelecteurSiteComponent,
    SelecteurProduitComponent,
  ],
  templateUrl: './planification-inventaire.component.html',
  styleUrl: './planification-inventaire.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanificationInventaireComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  inventaireId: string | null = null;
  loading = false;
  submitting = false;

  categories: CategorieStock[] = [];

  // Sélection de produits (périmètre SELECTION)
  ajoutProduitControl = new FormControl<string>('', { nonNullable: true });
  produitsSelectionnes: Produit[] = [];

  readonly PARAMS = PARAMETRES_STOCK;
  readonly PERIMETRES: { valeur: PerimetreInventaire; libelle: string; icone: string }[] = [
    { valeur: 'TOUS', libelle: 'Tout le stock', icone: 'Boxes' },
    { valeur: 'CATEGORIE', libelle: 'Une catégorie', icone: 'FolderTree' },
    { valeur: 'SELECTION', libelle: 'Sélection de produits', icone: 'ListChecks' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private service: StockV2InventaireService,
    private categorieService: StockV2CategorieService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      libelle: ['', [Validators.required, Validators.maxLength(120)]],
      datePlanifiee: [this.aujourdhui(), Validators.required],
      siteId: [''],
      perimetre: ['TOUS' as PerimetreInventaire, Validators.required],
      categorieId: [''],
      seuilEcartJustification: [this.PARAMS.seuilEcartJustificationDefaut, [Validators.required, Validators.min(0)]],
      commentaire: [''],
    });

    this.categorieService.listerToutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: c => { this.categories = c ?? []; this.cdr.markForCheck(); }, error: () => {} });

    this.inventaireId = this.route.snapshot.paramMap.get('id');
    if (this.inventaireId) this.charger(this.inventaireId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private charger(id: string): void {
    this.loading = true;
    this.service.getById(id)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: inv => {
          if (inv.statut !== 'BROUILLON') {
            this.toastr.info("Cet inventaire n'est plus modifiable (comptage démarré).");
            this.router.navigate(['/admin/stock-v2/stocks-approvisionnement/inventaires', id]);
            return;
          }
          this.form.patchValue({
            libelle: inv.libelle,
            datePlanifiee: inv.datePlanifiee?.substring(0, 10),
            siteId: inv.siteId ?? '',
            perimetre: inv.perimetre,
            categorieId: inv.categorieId ?? '',
            seuilEcartJustification: inv.seuilEcartJustification,
            commentaire: inv.commentaire ?? '',
          });
          // Les produits pré-sélectionnés (périmètre SELECTION) sont dérivés des lignes.
          this.produitsSelectionnes = inv.lignes.map(l => ({
            id: l.produitId,
            code: l.produitCode ?? '',
            libelle: l.produitLibelle ?? '',
          } as Produit));
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Inventaire introuvable.'),
      });
  }

  get perimetre(): PerimetreInventaire { return this.form.get('perimetre')!.value; }

  ajouterProduit(p: Produit): void {
    if (!p?.id) return;
    if (this.produitsSelectionnes.some(x => x.id === p.id)) {
      this.toastr.info('Produit déjà sélectionné.');
    } else {
      this.produitsSelectionnes = [...this.produitsSelectionnes, p];
    }
    this.ajoutProduitControl.setValue('', { emitEvent: false });
    this.cdr.markForCheck();
  }

  retirerProduit(id?: string): void {
    this.produitsSelectionnes = this.produitsSelectionnes.filter(p => p.id !== id);
    this.cdr.markForCheck();
  }

  enregistrer(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toastr.warning('Veuillez corriger les champs en erreur.'); return; }
    const v = this.form.value;
    if (v.perimetre === 'CATEGORIE' && !v.categorieId) {
      this.toastr.warning('Sélectionnez une catégorie pour ce périmètre.'); return;
    }
    if (v.perimetre === 'SELECTION' && this.produitsSelectionnes.length === 0) {
      this.toastr.warning('Ajoutez au moins un produit à inventorier.'); return;
    }

    const payload: InventairePayload = {
      libelle: v.libelle,
      datePlanifiee: v.datePlanifiee,
      siteId: v.siteId || undefined,
      perimetre: v.perimetre,
      categorieId: v.perimetre === 'CATEGORIE' ? v.categorieId : undefined,
      produitIds: v.perimetre === 'SELECTION' ? this.produitsSelectionnes.map(p => p.id!).filter(Boolean) : undefined,
      seuilEcartJustification: v.seuilEcartJustification,
      commentaire: v.commentaire || undefined,
    };

    this.submitting = true;
    const op$ = this.inventaireId
      ? this.service.modifier(this.inventaireId, payload)
      : this.service.creer(payload);

    op$.pipe(finalize(() => { this.submitting = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: inv => {
          this.toastr.success(this.inventaireId ? 'Inventaire modifié.' : 'Inventaire planifié.');
          this.router.navigate(['/admin/stock-v2/stocks-approvisionnement/inventaires', inv.id]);
        },
        error: () => this.toastr.error("Erreur lors de l'enregistrement."),
      });
  }

  get f() { return this.form.controls as { [key: string]: any }; }

  trackById(_: number, p: Produit): string { return p.id ?? p.code; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
