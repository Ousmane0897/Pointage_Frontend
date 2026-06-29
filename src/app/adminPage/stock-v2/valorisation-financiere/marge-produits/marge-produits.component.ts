import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2MargeService } from '../../../../services/stock-v2-marge.service';
import { StockV2ValorisationService } from '../../../../services/stock-v2-valorisation.service';
import { StockV2CategorieService } from '../../../../services/stock-v2-categorie.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import { FiltreMarge, MargeProduit, SyntheseMarges } from '../../../../models/stock-v2-marge.model';
import { CategorieStock } from '../../../../models/stock-v2-categorie.model';
import { DEVISE } from '../../../../constants/stock.constants';

type ColonneTri = 'produit' | 'tauxMarge' | 'margeGlobale' | 'quantite';

/**
 * Marge produits vendus — Module Stock v2 / 7.6 (fonctionnalité 6).
 *
 * Croise prix de vente, coût de revient et quantités vendues (VENTE_PRODUIT).
 * Édition inline du prix de vente (PATCH dédié). Mise en évidence des produits
 * non rentables. Exports PDF/Excel.
 */
@Component({
  selector: 'app-marge-produits',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './marge-produits.component.html',
  styleUrl: './marge-produits.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MargeProduitsComponent implements OnInit, OnDestroy {

  synthese: SyntheseMarges | null = null;
  loading = false;
  categories: CategorieStock[] = [];

  triColonne: ColonneTri = 'margeGlobale';
  triAsc = false;

  editId: string | null = null;
  editValeur = new FormControl<number | null>(null);

  filtres = new FormGroup({
    dateDebut: new FormControl<string>(this.dateDebutMois(), { nonNullable: true, validators: [Validators.required] }),
    dateFin: new FormControl<string>(this.aujourdhui(), { nonNullable: true, validators: [Validators.required] }),
    categorieId: new FormControl<string>('', { nonNullable: true }),
  });

  readonly DEVISE = DEVISE;

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2MargeService,
    private valorisationService: StockV2ValorisationService,
    private categorieService: StockV2CategorieService,
    private exportService: StockV2ExportService,
    private pdfService: StockV2PdfService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.categorieService.listerToutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: cats => { this.categories = cats ?? []; this.cdr.markForCheck(); } });
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    if (this.filtres.invalid) { this.toastr.warning('La période est requise.'); return; }
    this.loading = true;
    const v = this.filtres.getRawValue();
    const filtres: FiltreMarge = {
      dateDebut: v.dateDebut,
      dateFin: v.dateFin,
      categorieId: v.categorieId || undefined,
    };
    this.service.getSyntheseMarges(filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: s => { this.synthese = s; this.appliquerTri(); this.cdr.markForCheck(); },
        error: () => { this.synthese = null; this.toastr.error('Impossible de charger les marges.'); },
      });
  }

  // ─── Tri ──────────────────────────────────────────────────────────────────

  trier(colonne: ColonneTri): void {
    if (this.triColonne === colonne) { this.triAsc = !this.triAsc; }
    else { this.triColonne = colonne; this.triAsc = false; }
    this.appliquerTri();
    this.cdr.markForCheck();
  }

  private appliquerTri(): void {
    if (!this.synthese) return;
    const sens = this.triAsc ? 1 : -1;
    this.synthese.lignes = [...this.synthese.lignes].sort((a, b) => {
      switch (this.triColonne) {
        case 'produit': return sens * (a.produitLibelle ?? '').localeCompare(b.produitLibelle ?? '');
        case 'tauxMarge': return sens * (a.tauxMarge - b.tauxMarge);
        case 'margeGlobale': return sens * (a.margeGlobale - b.margeGlobale);
        case 'quantite': return sens * (a.quantiteVendue - b.quantiteVendue);
      }
    });
  }

  // ─── Édition inline du prix de vente ──────────────────────────────────────

  editerPrix(m: MargeProduit): void {
    this.editId = m.produitId;
    this.editValeur.setValue(m.prixVente ?? null);
  }

  annulerEdition(): void {
    this.editId = null;
    this.editValeur.reset();
  }

  enregistrerPrix(m: MargeProduit): void {
    const valeur = this.editValeur.value;
    if (valeur == null || valeur < 0) { this.toastr.warning('Prix de vente invalide.'); return; }
    this.valorisationService.setPrixVente(m.produitId, valeur)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toastr.success(`Prix de vente de « ${m.produitLibelle} » mis à jour.`); this.editId = null; this.charger(); },
        error: () => this.toastr.error('Mise à jour impossible.'),
      });
  }

  // ─── Exports ──────────────────────────────────────────────────────────────

  exporterExcel(): void {
    if (!this.synthese || this.synthese.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.exportService.exporterMarges(this.synthese);
  }

  exporterPdf(): void {
    if (!this.synthese || this.synthese.lignes.length === 0) { this.toastr.info('Aucune donnée à exporter.'); return; }
    this.pdfService.genererMarges(this.synthese);
  }

  classeTaux(m: MargeProduit): string {
    if (m.margeUnitaire < 0) return 'text-red-600';
    return m.rentable ? 'text-green-600' : 'text-amber-600';
  }

  trackById(_: number, m: MargeProduit): string { return m.produitId; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private dateDebutMois(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }
}
