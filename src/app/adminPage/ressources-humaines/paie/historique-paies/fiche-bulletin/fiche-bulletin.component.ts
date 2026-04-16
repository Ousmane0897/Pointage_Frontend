import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, catchError, of, takeUntil } from 'rxjs';

import { BulletinPaieService } from '../../../../../services/bulletin-paie.service';
import { BulletinPdfService } from '../../../../../services/bulletin-pdf.service';
import {
  BulletinPaie,
  LIBELLES_STATUT_BULLETIN,
  StatutBulletin,
} from '../../../../../models/bulletin-paie.model';
import { PreviewBulletinComponent } from '../../calcul-bulletin/preview-bulletin/preview-bulletin.component';

@Component({
  selector: 'app-fiche-bulletin',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, PreviewBulletinComponent],
  templateUrl: './fiche-bulletin.component.html',
  styleUrl: './fiche-bulletin.component.scss',
})
export class FicheBulletinComponent implements OnInit, OnDestroy {

  bulletin: BulletinPaie | null = null;
  historiqueEmploye: BulletinPaie[] = [];
  loading = false;
  errorMessage = '';
  changingStatut = false;

  readonly STATUTS: StatutBulletin[] = ['BROUILLON', 'VALIDE', 'PAYE', 'ANNULE'];
  readonly LIBELLES_STATUT = LIBELLES_STATUT_BULLETIN;

  /** Hauteur max relative utilisée pour l'histogramme (inline, sans dep Chart.js). */
  readonly BAR_HEIGHT_PX = 120;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bulletinService: BulletinPaieService,
    private pdfService: BulletinPdfService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Bulletin introuvable.';
      return;
    }
    this.charger(id);
  }

  private charger(id: string): void {
    this.loading = true;
    this.bulletinService.getById(id)
      .pipe(
        catchError(() => {
          this.errorMessage = 'Bulletin introuvable.';
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(b => {
        this.bulletin = b;
        if (b) this.chargerHistorique(b.employeId);
        else this.loading = false;
      });
  }

  private chargerHistorique(employeId: string): void {
    this.bulletinService.getByEmploye(employeId)
      .pipe(
        catchError(() => of([] as BulletinPaie[])),
        takeUntil(this.destroy$),
      )
      .subscribe(list => {
        this.historiqueEmploye = [...list].sort((a, b) => {
          const ka = a.periode.annee * 100 + a.periode.mois;
          const kb = b.periode.annee * 100 + b.periode.mois;
          return ka - kb;
        });
        this.loading = false;
      });
  }

  telecharger(): void {
    if (this.bulletin) this.pdfService.telechargerBulletin(this.bulletin);
  }

  changerStatut(statut: StatutBulletin): void {
    if (!this.bulletin?.id) return;
    this.changingStatut = true;
    this.bulletinService.changerStatut(this.bulletin.id, statut)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: b => {
          this.bulletin = b;
          this.changingStatut = false;
          this.toastr.success(`Bulletin passé au statut « ${LIBELLES_STATUT_BULLETIN[statut]} ».`);
        },
        error: () => {
          this.changingStatut = false;
          this.toastr.error('Opération impossible.');
        },
      });
  }

  retour(): void {
    this.router.navigate(['/admin/rh/paie/historique']);
  }

  // ─── Cumuls annuels calculés côté client ────────────────────────────────

  get cumulBrut(): number {
    if (!this.bulletin) return 0;
    return this.historiqueEmploye
      .filter(b => b.periode.annee === this.bulletin!.periode.annee)
      .reduce((s, b) => s + b.salaireBrut, 0);
  }

  get cumulNet(): number {
    if (!this.bulletin) return 0;
    return this.historiqueEmploye
      .filter(b => b.periode.annee === this.bulletin!.periode.annee)
      .reduce((s, b) => s + b.netAPayer, 0);
  }

  get cumulIR(): number {
    if (!this.bulletin) return 0;
    return this.historiqueEmploye
      .filter(b => b.periode.annee === this.bulletin!.periode.annee)
      .reduce((s, b) => s + b.impotRevenu, 0);
  }

  /** Valeur max du net pour normaliser la hauteur de l'histogramme. */
  get maxNetHistorique(): number {
    return Math.max(1, ...this.historiqueEmploye.map(b => b.netAPayer));
  }

  hauteurBarre(net: number): number {
    return Math.max(2, Math.round((net / this.maxNetHistorique) * this.BAR_HEIGHT_PX));
  }

  formaterFCFA(n: number | undefined): string {
    if (n === undefined || n === null) return '—';
    return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
  }

  nomMoisCourt(m: number): string {
    return ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'][(m - 1 + 12) % 12];
  }

  trackByPeriode(_: number, b: BulletinPaie): string {
    return b.id ?? `${b.periode.mois}-${b.periode.annee}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
