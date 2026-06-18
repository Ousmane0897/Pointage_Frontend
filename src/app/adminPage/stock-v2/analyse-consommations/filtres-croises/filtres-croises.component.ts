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
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2AnalyseCroiseeService } from '../../../../services/stock-v2-analyse-croisee.service';
import { StockV2CategorieService } from '../../../../services/stock-v2-categorie.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../services/stock-v2-pdf.service';
import {
  AxeAnalyse,
  MesureAnalyse,
  RequeteCroisee,
  RequeteFavorite,
  ResultatCroise,
} from '../../../../models/stock-v2-analyse-croisee.model';
import { TypeSortie } from '../../../../models/stock-v2-bon-sortie.model';
import { CategorieStock } from '../../../../models/stock-v2-categorie.model';
import { SelecteurSiteComponent } from '../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import { SelecteurProduitComponent } from '../../stocks-approvisionnement/shared/selecteur-produit/selecteur-produit.component';
import {
  COULEURS_CHARTS,
  DEVISE,
  LIBELLES_TYPE_SORTIE,
  ORDRE_TYPES_SORTIE,
} from '../../../../constants/stock.constants';

const LIBELLES_AXE: Record<AxeAnalyse, string> = {
  PRODUIT: 'Produit',
  CATEGORIE: 'Catégorie',
  SITE: 'Site',
  TYPE_SORTIE: 'Type de sortie',
  NATURE_DON: 'Nature de don',
  MOIS: 'Mois',
};

/**
 * Filtres croisés — Module Stock v2 / 7.5 (fonctionnalité 5).
 *
 * Analyse multidimensionnelle : construction d'une requête pivot (axe lignes ×
 * axe colonnes, mesure montant/quantité) sur les sorties. Tableau pivotable avec
 * totaux de marges, chart adaptatif, requêtes favorites en localStorage,
 * exports PDF/Excel.
 */
@Component({
  selector: 'app-filtres-croises',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    BaseChartDirective,
    SelecteurSiteComponent,
    SelecteurProduitComponent,
  ],
  templateUrl: './filtres-croises.component.html',
  styleUrl: './filtres-croises.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltresCroisesComponent implements OnInit, OnDestroy {

  resultat: ResultatCroise | null = null;
  loading = false;
  categories: CategorieStock[] = [];
  favoris: RequeteFavorite[] = [];

  readonly DEVISE = DEVISE;
  readonly LIBELLES_AXE = LIBELLES_AXE;
  readonly LIBELLES_TYPE_SORTIE = LIBELLES_TYPE_SORTIE;
  readonly TYPES_SORTIE = ORDRE_TYPES_SORTIE;
  readonly AXES: AxeAnalyse[] = ['PRODUIT', 'CATEGORIE', 'SITE', 'TYPE_SORTIE', 'NATURE_DON', 'MOIS'];
  readonly MESURES: { value: MesureAnalyse; libelle: string }[] = [
    { value: 'MONTANT', libelle: 'Montant (FCFA)' },
    { value: 'QUANTITE', libelle: 'Quantité' },
  ];

  filtres = new FormGroup({
    axeLignes: new FormControl<AxeAnalyse>('PRODUIT', { nonNullable: true, validators: [Validators.required] }),
    axeColonnes: new FormControl<AxeAnalyse | ''>('', { nonNullable: true }),
    mesure: new FormControl<MesureAnalyse>('MONTANT', { nonNullable: true, validators: [Validators.required] }),
    dateDebut: new FormControl<string>(this.dateDebutAnnee(), { nonNullable: true, validators: [Validators.required] }),
    dateFin: new FormControl<string>(this.aujourdhui(), { nonNullable: true, validators: [Validators.required] }),
    siteId: new FormControl<string>('', { nonNullable: true }),
    produitId: new FormControl<string>('', { nonNullable: true }),
    categorieId: new FormControl<string>('', { nonNullable: true }),
    typeSortie: new FormControl<TypeSortie | ''>('', { nonNullable: true }),
  });

  barData: ChartData<'bar'> | null = null;
  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2AnalyseCroiseeService,
    private categorieService: StockV2CategorieService,
    private exportService: StockV2ExportService,
    private pdfService: StockV2PdfService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.favoris = this.service.listerFavoris();
    this.categorieService.listerToutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: cats => { this.categories = cats ?? []; this.cdr.markForCheck(); } });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private construireRequete(): RequeteCroisee {
    const v = this.filtres.getRawValue();
    return {
      axeLignes: v.axeLignes,
      axeColonnes: v.axeColonnes || undefined,
      mesure: v.mesure,
      dateDebut: v.dateDebut,
      dateFin: v.dateFin,
      filtres: {
        siteId: v.siteId || undefined,
        produitId: v.produitId || undefined,
        categorieId: v.categorieId || undefined,
        typeSortie: v.typeSortie || undefined,
      },
    };
  }

  executer(): void {
    if (this.filtres.invalid) { this.toastr.warning('Axe, mesure et période sont requis.'); return; }
    this.loading = true;
    this.service.executer(this.construireRequete())
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.resultat = r; this.construireChart(); this.cdr.markForCheck(); },
        error: () => { this.resultat = null; this.toastr.error("Impossible d'exécuter la requête."); },
      });
  }

  private construireChart(): void {
    const r = this.resultat;
    if (!r || r.lignes.length === 0) { this.barData = null; return; }
    const lignes = [...r.lignes].sort((a, b) => b.total - a.total).slice(0, 15);
    this.barData = {
      labels: lignes.map(l => l.libelle),
      datasets: [{
        data: lignes.map(l => l.total),
        label: r.mesure === 'MONTANT' ? 'Montant (FCFA)' : 'Quantité',
        backgroundColor: lignes.map((_, i) => COULEURS_CHARTS[i % COULEURS_CHARTS.length]),
      }],
    };
  }

  // ─── Favoris (localStorage) ────────────────────────────────────────────────

  sauverFavori(): void {
    const nom = window.prompt('Nom de la requête favorite :');
    if (!nom || !nom.trim()) return;
    this.favoris = this.service.sauverFavori(nom.trim(), this.construireRequete());
    this.toastr.success('Requête enregistrée.');
    this.cdr.markForCheck();
  }

  chargerFavori(f: RequeteFavorite): void {
    const r = f.requete;
    this.filtres.patchValue({
      axeLignes: r.axeLignes,
      axeColonnes: r.axeColonnes ?? '',
      mesure: r.mesure,
      dateDebut: r.dateDebut,
      dateFin: r.dateFin,
      siteId: r.filtres.siteId ?? '',
      produitId: r.filtres.produitId ?? '',
      categorieId: r.filtres.categorieId ?? '',
      typeSortie: r.filtres.typeSortie ?? '',
    });
    this.executer();
  }

  supprimerFavori(f: RequeteFavorite, ev: Event): void {
    ev.stopPropagation();
    this.favoris = this.service.supprimerFavori(f.id);
    this.cdr.markForCheck();
  }

  // ─── Exports ───────────────────────────────────────────────────────────────

  exporterExcel(): void {
    if (!this.resultat || this.resultat.lignes.length === 0) { this.toastr.info('Aucun résultat à exporter.'); return; }
    this.exportService.exporterCroise(this.resultat);
  }

  exporterPdf(): void {
    if (!this.resultat || this.resultat.lignes.length === 0) { this.toastr.info('Aucun résultat à exporter.'); return; }
    const v = this.filtres.getRawValue();
    this.pdfService.genererCroise(this.resultat, { periode: `${v.dateDebut} → ${v.dateFin}` });
  }

  get aColonnes(): boolean { return (this.resultat?.entetesColonnes.length ?? 0) > 0; }

  trackByIndex(i: number): number { return i; }
  trackByFavori(_: number, f: RequeteFavorite): string { return f.id; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private dateDebutAnnee(): string {
    return `${new Date().getFullYear()}-01-01`;
  }
}
