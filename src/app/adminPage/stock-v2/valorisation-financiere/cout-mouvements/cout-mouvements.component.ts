import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, finalize, takeUntil } from 'rxjs/operators';

import { StockV2ValorisationService } from '../../../../services/stock-v2-valorisation.service';
import { StockV2ExportService } from '../../../../services/stock-v2-export.service';
import { FiltreCoutMouvement, LigneCoutMouvement } from '../../../../models/stock-v2-valorisation.model';
import { TypeMouvement } from '../../../../models/stock-v2-mouvement.model';
import { SelecteurSiteComponent } from '../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import { SelecteurProduitComponent } from '../../stocks-approvisionnement/shared/selecteur-produit/selecteur-produit.component';
import {
  LIBELLES_TYPE_MOUVEMENT,
  COULEURS_TYPE_MOUVEMENT,
  LIBELLES_UNITE,
  DEVISE,
} from '../../../../constants/stock.constants';
import { PARAMETRES_VALORISATION } from '../../../../constants/stock-v2-valorisation.constants';

/**
 * Coût de chaque mouvement — Module Stock v2 / 7.6 (fonctionnalité 2).
 *
 * Liste filtrable des mouvements valorisés (coût snapshot + valeur). Le drapeau
 * `estEstime` signale un coût reconstitué (mouvement antérieur à 7.6, sans snapshot).
 */
@Component({
  selector: 'app-cout-mouvements',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, SelecteurSiteComponent, SelecteurProduitComponent],
  templateUrl: './cout-mouvements.component.html',
  styleUrl: './cout-mouvements.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoutMouvementsComponent implements OnInit, OnDestroy {

  lignes: LigneCoutMouvement[] = [];
  loading = false;

  page = 0;
  size = PARAMETRES_VALORISATION.pageSize;
  totalElements = 0;
  totalPages = 0;

  filtres = new FormGroup({
    q: new FormControl<string>('', { nonNullable: true }),
    produitId: new FormControl<string>('', { nonNullable: true }),
    type: new FormControl<TypeMouvement | ''>('', { nonNullable: true }),
    siteId: new FormControl<string>('', { nonNullable: true }),
    dateDebut: new FormControl<string>('', { nonNullable: true }),
    dateFin: new FormControl<string>('', { nonNullable: true }),
  });

  readonly LIBELLES_TYPE_MOUVEMENT = LIBELLES_TYPE_MOUVEMENT;
  readonly COULEURS_TYPE_MOUVEMENT = COULEURS_TYPE_MOUVEMENT;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly TYPES: TypeMouvement[] = ['ENTREE', 'SORTIE', 'TRANSFERT'];
  readonly DEVISE = DEVISE;

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2ValorisationService,
    private exportService: StockV2ExportService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.filtres.valueChanges
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => { this.page = 0; this.charger(); });
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    this.loading = true;
    const v = this.filtres.getRawValue();
    const filtres: FiltreCoutMouvement = {
      q: v.q?.trim() || undefined,
      produitId: v.produitId || undefined,
      type: v.type || undefined,
      siteId: v.siteId || undefined,
      dateDebut: v.dateDebut || undefined,
      dateFin: v.dateFin || undefined,
    };
    this.service.listerCoutsMouvements(this.page, this.size, filtres)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.lignes = res.content;
          this.totalElements = res.totalElements;
          this.totalPages = Math.max(1, Math.ceil(res.totalElements / this.size));
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de charger les coûts de mouvements.'),
      });
  }

  pagePrecedente(): void { if (this.page > 0) { this.page--; this.charger(); } }
  pageSuivante(): void { if (this.page < this.totalPages - 1) { this.page++; this.charger(); } }

  exporter(): void {
    if (this.lignes.length === 0) { this.toastr.info('Aucun mouvement à exporter sur cette page.'); return; }
    this.exportService.exporterCoutsMouvements(this.lignes);
  }

  site(l: LigneCoutMouvement): string {
    return l.mouvement.siteSourceNom ?? l.mouvement.siteDestinationNom ?? '—';
  }

  trackByIndex(i: number): number { return i; }
}
