import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2ApprovisionnementService } from '../../../../services/stock-v2-approvisionnement.service';
import { StockV2CategorieService } from '../../../../services/stock-v2-categorie.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import {
  SuggestionAppro,
  ParametresAppro,
  BonCommandePrevisionnel,
  LigneBonCommande,
} from '../../../../models/stock-v2-approvisionnement.model';
import { CategorieStock } from '../../../../models/stock-v2-categorie.model';
import { SelecteurSiteComponent } from '../shared/selecteur-site/selecteur-site.component';
import { LIBELLES_UNITE, PARAMETRES_STOCK } from '../../../../constants/stock.constants';

@Component({
  selector: 'app-approvisionnement-auto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, SelecteurSiteComponent],
  templateUrl: './approvisionnement-auto.component.html',
  styleUrl: './approvisionnement-auto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovisionnementAutoComponent implements OnInit, OnDestroy {

  suggestions: SuggestionAppro[] = [];
  loading = false;

  nMoisControl = new FormControl<number>(PARAMETRES_STOCK.nMoisApproDefaut, { nonNullable: true });
  siteControl = new FormControl<string>('', { nonNullable: true });
  categorieControl = new FormControl<string>('', { nonNullable: true });

  // Quantités éditables, parallèles à `suggestions`
  quantites!: FormArray<FormControl<number>>;

  categories: CategorieStock[] = [];

  readonly LIBELLES_UNITE = LIBELLES_UNITE;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private service: StockV2ApprovisionnementService,
    private categorieService: StockV2CategorieService,
    private pdfService: StockV2PdfService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.quantites = this.fb.array<FormControl<number>>([]);
    this.categorieService.listerToutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: c => { this.categories = c ?? []; this.cdr.markForCheck(); }, error: () => {} });
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    const params: ParametresAppro = {
      nMois: this.nMoisControl.value || PARAMETRES_STOCK.nMoisApproDefaut,
      siteId: this.siteControl.value || undefined,
      categorieId: this.categorieControl.value || undefined,
    };
    this.loading = true;
    this.service.getSuggestions(params)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: s => {
          this.suggestions = s ?? [];
          this.quantites.clear();
          this.suggestions.forEach(sug =>
            this.quantites.push(this.fb.control<number>(Math.max(0, Math.round(sug.quantiteSuggeree)), { nonNullable: true })),
          );
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de calculer les suggestions.'),
      });
  }

  montantLigne(i: number): number {
    const q = this.quantites.at(i)?.value ?? 0;
    return q * (this.suggestions[i]?.prixUnitaire ?? 0);
  }

  get montantTotal(): number {
    return this.suggestions.reduce((acc, _, i) => acc + this.montantLigne(i), 0);
  }

  get nbLignesRetenues(): number {
    return this.quantites.controls.filter(c => (c.value ?? 0) > 0).length;
  }

  genererBonCommande(): void {
    const lignes: LigneBonCommande[] = this.suggestions
      .map((s, i) => ({ s, q: this.quantites.at(i)?.value ?? 0 }))
      .filter(x => x.q > 0)
      .map(x => ({
        produitId: x.s.produitId,
        produitCode: x.s.produitCode,
        produitLibelle: x.s.produitLibelle,
        unite: x.s.unite,
        quantite: x.q,
        prixUnitaire: x.s.prixUnitaire,
        montant: x.q * x.s.prixUnitaire,
      }));

    if (lignes.length === 0) {
      this.toastr.warning('Aucune quantité à commander.');
      return;
    }

    const bon: BonCommandePrevisionnel = {
      fournisseur: this.fournisseurCommun(lignes),
      date: this.aujourdhui(),
      lignes,
      montantTotal: lignes.reduce((a, l) => a + l.montant, 0),
    };
    this.pdfService.genererBonCommande(bon);
    this.toastr.success('Bon de commande prévisionnel généré.');
  }

  private fournisseurCommun(lignes: LigneBonCommande[]): string | undefined {
    const fournisseurs = new Set(
      this.suggestions
        .filter(s => lignes.some(l => l.produitId === s.produitId))
        .map(s => s.fournisseurPrincipal)
        .filter(Boolean) as string[],
    );
    return fournisseurs.size === 1 ? [...fournisseurs][0] : undefined;
  }

  trackById(_: number, s: SuggestionAppro): string { return s.produitId; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
