import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2AnalyseChantierService } from '../../../../../services/stock-v2-analyse-chantier.service';
import { StockV2ExportService } from '../../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../../services/stock-v2-pdf.service';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';
import { DetailChantier, LigneConsommationChantier } from '../../../../../models/stock-v2-chantier.model';
import {
  LIBELLES_STATUT_CHANTIER,
  COULEURS_STATUT_CHANTIER,
  LIBELLES_UNITE,
  DEVISE,
} from '../../../../../constants/stock.constants';

/**
 * Fiche détaillée d'un chantier — Module Stock v2 / 7.5 (fonctionnalité 2).
 *
 * Affiche l'entité + les lignes de consommation valorisées (agrégées serveur).
 * Permet la clôture (EN_COURS → CLOTURE, figé) et la génération du rapport PDF
 * de fin de chantier (facturation / archivage).
 */
@Component({
  selector: 'app-fiche-chantier',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './fiche-chantier.component.html',
  styleUrl: './fiche-chantier.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FicheChantierComponent implements OnInit, OnDestroy {

  detail: DetailChantier | null = null;
  loading = false;
  cloturing = false;

  readonly LIBELLES_STATUT_CHANTIER = LIBELLES_STATUT_CHANTIER;
  readonly COULEURS_STATUT_CHANTIER = COULEURS_STATUT_CHANTIER;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly DEVISE = DEVISE;

  private id!: string;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: StockV2AnalyseChantierService,
    private exportService: StockV2ExportService,
    private pdfService: StockV2PdfService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get estEnCours(): boolean { return this.detail?.chantier.statut === 'EN_COURS'; }

  charger(): void {
    this.loading = true;
    this.service.getDetail(this.id)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: d => { this.detail = d; this.cdr.markForCheck(); },
        error: () => {
          this.toastr.error('Chantier introuvable.');
          this.router.navigate(['/admin/stock-v2/analyse-consommations/chantiers']);
        },
      });
  }

  modifier(): void {
    if (!this.detail || !this.estEnCours) return;
    this.router.navigate(['/admin/stock-v2/analyse-consommations/chantiers', this.id, 'modifier']);
  }

  cloturer(): void {
    if (!this.detail || !this.estEnCours) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        message: `Clôturer le chantier « ${this.detail.chantier.reference} » ?\nLe chantier sera figé : plus aucune consommation ne pourra y être rattachée.`,
        confirmLabel: 'Clôturer',
        confirmColor: 'primary',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.cloturing = true;
      this.service.cloturer(this.id)
        .pipe(finalize(() => { this.cloturing = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.toastr.success('Chantier clôturé.'); this.charger(); },
          error: () => this.toastr.error('Clôture impossible.'),
        });
    });
  }

  exporterExcel(): void {
    if (!this.detail) return;
    this.exportService.exporterDetailChantier(this.detail);
  }

  exporterPdf(): void {
    if (!this.detail) return;
    this.pdfService.genererRapportChantier(this.detail);
  }

  trackByProduit(_: number, l: LigneConsommationChantier): string { return l.produitId; }
}
