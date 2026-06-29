import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2ProduitService } from '../../../../../services/stock-v2-produit.service';
import { Produit } from '../../../../../models/stock-v2-produit.model';
import {
  LIBELLES_TYPE_PRODUIT,
  COULEURS_TYPE_PRODUIT,
  LIBELLES_UNITE,
} from '../../../../../constants/stock.constants';

@Component({
  selector: 'app-fiche-produit',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './fiche-produit.component.html',
  styleUrl: './fiche-produit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FicheProduitComponent implements OnInit, OnDestroy {

  produit: Produit | null = null;
  loading = false;
  photoUrl: string | null = null;
  telechargementFiche = false;

  readonly LIBELLES_TYPE_PRODUIT = LIBELLES_TYPE_PRODUIT;
  readonly COULEURS_TYPE_PRODUIT = COULEURS_TYPE_PRODUIT;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private produitService: StockV2ProduitService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading = true;
    this.produitService.getById(id)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: p => {
          this.produit = p;
          if (p.id && p.photoUrl) this.chargerPhoto(p.id);
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Produit introuvable.'),
      });
  }

  ngOnDestroy(): void {
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private chargerPhoto(id: string): void {
    this.produitService.getPhotoBlob(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: blob => { this.photoUrl = URL.createObjectURL(blob); this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  telechargerFiche(): void {
    if (!this.produit?.id) return;
    this.telechargementFiche = true;
    this.produitService.telechargerFicheTechnique(this.produit.id)
      .pipe(finalize(() => { this.telechargementFiche = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.produit?.ficheTechniqueNom ?? 'fiche-technique.pdf';
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.toastr.error('Téléchargement de la fiche impossible.'),
      });
  }

  estSousSeuil(): boolean {
    if (!this.produit) return false;
    return (this.produit.quantiteTotale ?? 0) <= this.produit.seuilAlerte;
  }
}
