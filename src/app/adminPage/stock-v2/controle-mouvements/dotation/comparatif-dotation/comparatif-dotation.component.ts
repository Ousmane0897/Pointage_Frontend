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

import { StockV2DotationService } from '../../../../../services/stock-v2-dotation.service';
import { StockV2ExportService } from '../../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../../services/stock-v2-pdf.service';
import { ComparatifDotation, FiltreDotation } from '../../../../../models/stock-v2-dotation.model';
import { SelecteurSiteComponent } from '../../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import { SelecteurProduitComponent } from '../../../stocks-approvisionnement/shared/selecteur-produit/selecteur-produit.component';
import {
  LIBELLES_SENS_ECART_DOTATION,
  COULEURS_SENS_ECART_DOTATION,
  LIBELLES_UNITE,
} from '../../../../../constants/stock.constants';

/**
 * Dotation prévue vs réelle — Module Stock v2 / 7.4 (fonctionnalité 8).
 *
 * Tableau comparatif mensuel entre dotation planifiée (plafonds) et
 * distribution réelle, avec écarts mis en évidence (code couleur).
 */
@Component({
  selector: 'app-comparatif-dotation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    SelecteurSiteComponent,
    SelecteurProduitComponent,
  ],
  templateUrl: './comparatif-dotation.component.html',
  styleUrl: './comparatif-dotation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparatifDotationComponent implements OnInit, OnDestroy {

  comparatif: ComparatifDotation | null = null;
  loading = false;

  filtres = new FormGroup({
    mois: new FormControl<string>(this.moisCourant(), { nonNullable: true, validators: [Validators.required] }),
    siteId: new FormControl<string>('', { nonNullable: true }),
    produitId: new FormControl<string>('', { nonNullable: true }),
  });

  readonly LIBELLES_SENS_ECART_DOTATION = LIBELLES_SENS_ECART_DOTATION;
  readonly COULEURS_SENS_ECART_DOTATION = COULEURS_SENS_ECART_DOTATION;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2DotationService,
    private exportService: StockV2ExportService,
    private pdfService: StockV2PdfService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    if (this.filtres.invalid) { this.toastr.warning('Le mois est requis.'); return; }
    this.loading = true;
    const v = this.filtres.getRawValue();
    const filtres: FiltreDotation = {
      mois: v.mois,
      siteId: v.siteId || undefined,
      produitId: v.produitId || undefined,
    };
    this.service.comparatif(filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: c => { this.comparatif = c; this.cdr.markForCheck(); },
        error: () => this.toastr.error('Impossible de charger le comparatif.'),
      });
  }

  exporterExcel(): void {
    if (!this.comparatif || this.comparatif.lignes.length === 0) {
      this.toastr.info('Aucune donnée à exporter.');
      return;
    }
    this.exportService.exporterDotation(this.comparatif);
  }

  exporterPdf(): void {
    if (!this.comparatif || this.comparatif.lignes.length === 0) {
      this.toastr.info('Aucune donnée à exporter.');
      return;
    }
    this.pdfService.genererComparatifDotation(this.comparatif);
  }

  trackByIndex(i: number): number { return i; }

  private moisCourant(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
