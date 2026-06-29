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
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2CoutChantierService } from '../../../../../services/stock-v2-cout-chantier.service';
import { StockV2ExportService } from '../../../../../services/stock-v2-export.service';
import { StockV2PdfService } from '../../../../../services/stock-v2-pdf.service';
import { CoutRevientChantier, LigneCoutChantier } from '../../../../../models/stock-v2-cout-chantier.model';
import {
  LIBELLES_STATUT_CHANTIER,
  COULEURS_STATUT_CHANTIER,
  LIBELLES_UNITE,
  DEVISE,
} from '../../../../../constants/stock.constants';

/**
 * Fiche de coût de revient d'un chantier — Module Stock v2 / 7.6 (fonctionnalité 5).
 *
 * Détail valorisé au coût de revient + coût par jour + comparaison aux chantiers
 * similaires + rapport PDF de coût de revient (facturation client).
 */
@Component({
  selector: 'app-fiche-cout-chantier',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './fiche-cout-chantier.component.html',
  styleUrl: './fiche-cout-chantier.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FicheCoutChantierComponent implements OnInit, OnDestroy {

  detail: CoutRevientChantier | null = null;
  loading = false;

  readonly LIBELLES_STATUT_CHANTIER = LIBELLES_STATUT_CHANTIER;
  readonly COULEURS_STATUT_CHANTIER = COULEURS_STATUT_CHANTIER;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly DEVISE = DEVISE;

  private id!: string;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: StockV2CoutChantierService,
    private exportService: StockV2ExportService,
    private pdfService: StockV2PdfService,
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

  charger(): void {
    this.loading = true;
    this.service.getDetail(this.id)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: d => { this.detail = d; this.cdr.markForCheck(); },
        error: () => {
          this.toastr.error('Chantier introuvable.');
          this.router.navigate(['/admin/stock-v2/valorisation-financiere/cout-chantier']);
        },
      });
  }

  exporterExcel(): void {
    if (!this.detail) return;
    this.exportService.exporterCoutRevientChantier(this.detail);
  }

  exporterPdf(): void {
    if (!this.detail) return;
    this.pdfService.genererCoutRevientChantier(this.detail);
  }

  trackByProduit(_: number, l: LigneCoutChantier): string { return l.produitId; }
}
