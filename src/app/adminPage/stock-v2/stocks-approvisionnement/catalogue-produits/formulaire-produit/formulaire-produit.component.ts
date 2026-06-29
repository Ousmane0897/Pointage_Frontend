import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2ProduitService } from '../../../../../services/stock-v2-produit.service';
import { StockV2CategorieService } from '../../../../../services/stock-v2-categorie.service';
import { Produit, TypeProduit, UniteStock } from '../../../../../models/stock-v2-produit.model';
import { CategorieStock } from '../../../../../models/stock-v2-categorie.model';
import {
  LIBELLES_TYPE_PRODUIT,
  LIBELLES_UNITE,
  ORDRE_TYPES_PRODUIT,
  ORDRE_UNITES,
  PARAMETRES_STOCK,
} from '../../../../../constants/stock.constants';

@Component({
  selector: 'app-formulaire-produit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './formulaire-produit.component.html',
  styleUrl: './formulaire-produit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaireProduitComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  produitId: string | null = null;
  loading = false;
  submitting = false;

  categories: CategorieStock[] = [];

  // Photo
  photoFile: File | null = null;
  photoApercu: string | null = null;     // ObjectURL local (nouvelle photo)
  photoNomActuel: string | null = null;
  photoAEnlever = false;

  // Fiche technique
  ficheFile: File | null = null;
  ficheNomActuel: string | null = null;
  ficheAEnlever = false;

  readonly LIBELLES_TYPE_PRODUIT = LIBELLES_TYPE_PRODUIT;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly TYPES: TypeProduit[] = ORDRE_TYPES_PRODUIT;
  readonly UNITES: UniteStock[] = ORDRE_UNITES;
  readonly PARAMS = PARAMETRES_STOCK;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private produitService: StockV2ProduitService,
    private categorieService: StockV2CategorieService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(40)]],
      libelle: ['', [Validators.required, Validators.maxLength(150)]],
      typeProduit: ['CONSOMMABLE' as TypeProduit, Validators.required],
      categorieId: [''],
      sousCategorie: [''],
      unite: ['PIECE' as UniteStock, Validators.required],
      fournisseurPrincipal: [''],
      seuilAlerte: [0, [Validators.required, Validators.min(0)]],
      prixUnitaire: [0, [Validators.required, Validators.min(0)]],
      actif: [true],
      remarque: [''],
    });

    this.categorieService.listerToutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: c => { this.categories = c ?? []; this.cdr.markForCheck(); }, error: () => {} });

    this.produitId = this.route.snapshot.paramMap.get('id');
    if (this.produitId) this.charger(this.produitId);
  }

  ngOnDestroy(): void {
    if (this.photoApercu) URL.revokeObjectURL(this.photoApercu);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private charger(id: string): void {
    this.loading = true;
    this.produitService.getById(id)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: p => {
          this.form.patchValue({
            code: p.code,
            libelle: p.libelle,
            typeProduit: p.typeProduit,
            categorieId: p.categorieId ?? '',
            sousCategorie: p.sousCategorie ?? '',
            unite: p.unite,
            fournisseurPrincipal: p.fournisseurPrincipal ?? '',
            seuilAlerte: p.seuilAlerte,
            prixUnitaire: p.prixUnitaire,
            actif: p.actif,
            remarque: p.remarque ?? '',
          });
          this.photoNomActuel = p.photoNom ?? null;
          this.ficheNomActuel = p.ficheTechniqueNom ?? null;
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de charger le produit.'),
      });
  }

  // ─── Photo ────────────────────────────────────────────────────────────────

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const f = input.files[0];
    if (!this.PARAMS.typesImageAcceptes.includes(f.type as 'image/jpeg')) {
      this.toastr.warning('Format image non supporté (JPEG, PNG, WebP).');
      return;
    }
    if (f.size > this.PARAMS.tailleMaxPhotoMo * 1024 * 1024) {
      this.toastr.warning(`La photo ne doit pas dépasser ${this.PARAMS.tailleMaxPhotoMo} Mo.`);
      return;
    }
    if (this.photoApercu) URL.revokeObjectURL(this.photoApercu);
    this.photoFile = f;
    this.photoApercu = URL.createObjectURL(f);
    this.photoAEnlever = false;
    this.cdr.markForCheck();
  }

  enleverPhotoSelectionnee(): void {
    if (this.photoApercu) URL.revokeObjectURL(this.photoApercu);
    this.photoFile = null;
    this.photoApercu = null;
    this.cdr.markForCheck();
  }

  marquerPhotoExistantePourSuppression(): void { this.photoAEnlever = true; this.cdr.markForCheck(); }
  annulerSuppressionPhoto(): void { this.photoAEnlever = false; this.cdr.markForCheck(); }

  // ─── Fiche technique ────────────────────────────────────────────────────

  onFicheSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const f = input.files[0];
    if (!this.PARAMS.typesFicheAcceptes.includes(f.type as 'application/pdf')) {
      this.toastr.warning('Seul un fichier PDF est accepté pour la fiche technique.');
      return;
    }
    if (f.size > this.PARAMS.tailleMaxFicheMo * 1024 * 1024) {
      this.toastr.warning(`La fiche technique ne doit pas dépasser ${this.PARAMS.tailleMaxFicheMo} Mo.`);
      return;
    }
    this.ficheFile = f;
    this.ficheAEnlever = false;
    this.cdr.markForCheck();
  }

  enleverFicheSelectionnee(): void { this.ficheFile = null; this.cdr.markForCheck(); }
  marquerFicheExistantePourSuppression(): void { this.ficheAEnlever = true; this.cdr.markForCheck(); }
  annulerSuppressionFiche(): void { this.ficheAEnlever = false; this.cdr.markForCheck(); }

  // ─── Soumission ───────────────────────────────────────────────────────────

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez corriger les champs en erreur.');
      return;
    }

    const valeur = this.form.value;
    const categorie = this.categories.find(c => c.id === valeur.categorieId);
    const payload: Produit = {
      ...valeur,
      categorieId: valeur.categorieId || undefined,
      categorieLibelle: categorie?.libelle,
    } as Produit;

    const formData = new FormData();
    formData.append('produit', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (this.photoFile) formData.append('photo', this.photoFile, this.photoFile.name);
    if (this.ficheFile) formData.append('ficheTechnique', this.ficheFile, this.ficheFile.name);
    if (this.produitId && this.photoAEnlever && !this.photoFile) formData.append('supprimerPhoto', 'true');
    if (this.produitId && this.ficheAEnlever && !this.ficheFile) formData.append('supprimerFicheTechnique', 'true');

    this.submitting = true;
    const op$ = this.produitId
      ? this.produitService.modifier(this.produitId, formData)
      : this.produitService.creer(formData);

    op$.pipe(
      finalize(() => { this.submitting = false; this.cdr.markForCheck(); }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: () => {
        this.toastr.success(this.produitId ? 'Produit modifié.' : 'Produit créé.');
        this.router.navigate(['/admin/stock-v2/stocks-approvisionnement/produits']);
      },
      error: err => {
        if (err?.status === 409) this.toastr.error('Ce code produit est déjà utilisé.');
        else this.toastr.error("Erreur lors de l'enregistrement.");
      },
    });
  }

  get f() { return this.form.controls as { [key: string]: any }; }
}
