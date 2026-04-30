import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { FormationService } from '../../../../../../services/formation.service';
import { DossierEmployeService } from '../../../../../../services/dossier-employe.service';
import {
  BesoinFormation,
  FiltreBesoinFormation,
  PrioriteBesoin,
  StatutBesoin,
  SourceBesoin,
  LIBELLES_PRIORITE_BESOIN,
  LIBELLES_STATUT_BESOIN,
  LIBELLES_SOURCE_BESOIN,
} from '../../../../../../models/formation.model';
import { PageResponse } from '../../../../../../models/pageResponse.model';
import { ConfirmDialogComponent } from '../../../../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-liste-besoins',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-besoins.component.html',
  styleUrl: './liste-besoins.component.scss',
})
export class ListeBesoinsComponent implements OnInit, OnDestroy {

  besoins: BesoinFormation[] = [];
  departements: string[] = [];
  total = 0;
  totalPages = 0;
  page = 0;
  size = 10;
  loading = false;

  filtres: FiltreBesoinFormation = { departement: '', priorite: undefined, statut: undefined, q: '' };

  private destroy$ = new Subject<void>();

  constructor(
    private formationService: FormationService,
    private dossierEmployeService: DossierEmployeService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadDepartements();
    this.loadBesoins();
  }

  private loadDepartements(): void {
    this.dossierEmployeService.getDepartements().pipe(
      catchError(() => of([])),
      takeUntil(this.destroy$),
    ).subscribe(deps => (this.departements = deps));
  }

  loadBesoins(): void {
    this.loading = true;
    const f: FiltreBesoinFormation = {
      departement: this.filtres.departement || undefined,
      priorite: this.filtres.priorite || undefined,
      statut: this.filtres.statut || undefined,
      q: this.filtres.q || undefined,
    };

    this.formationService.listerBesoins(this.page, this.size, f).pipe(
      catchError(err => { this.handleError(err); return of({ content: [], totalElements: 0 } as PageResponse<BesoinFormation>); }),
      finalize(() => (this.loading = false)),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      this.besoins = res.content;
      this.total = res.totalElements ?? 0;
      this.totalPages = Math.ceil(this.total / this.size);
    });
  }

  applyFilters(): void { this.page = 0; this.loadBesoins(); }
  resetFilters(): void {
    this.filtres = { departement: '', priorite: undefined, statut: undefined, q: '' };
    this.page = 0;
    this.loadBesoins();
  }

  nouveau(): void { this.router.navigate(['/admin/rh/developpement-rh/formations/besoins/nouveau']); }
  modifier(b: BesoinFormation): void {
    if (b.id) this.router.navigate(['/admin/rh/developpement-rh/formations/besoins', b.id, 'modifier']);
  }

  supprimer(b: BesoinFormation): void {
    if (!b.id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { message: `Supprimer ce besoin de formation ? Cette action est irréversible.` },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (!confirmed) return;
      this.formationService.supprimerBesoin(b.id!).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastr.success('Besoin supprimé.', 'Succès');
          if (this.besoins.length === 1 && this.page > 0) this.page--;
          this.loadBesoins();
        },
        error: err => this.handleError(err),
      });
    });
  }

  getPrioriteLabel(p: PrioriteBesoin): string { return LIBELLES_PRIORITE_BESOIN[p] ?? p; }
  getStatutLabel(s: StatutBesoin): string { return LIBELLES_STATUT_BESOIN[s] ?? s; }
  getSourceLabel(s: SourceBesoin): string { return LIBELLES_SOURCE_BESOIN[s] ?? s; }

  getPrioriteClasses(p: PrioriteBesoin): string {
    const map: Record<PrioriteBesoin, string> = {
      HAUTE: 'bg-red-100 text-red-700 border border-red-200',
      MOYENNE: 'bg-amber-100 text-amber-700 border border-amber-200',
      BASSE: 'bg-green-100 text-green-700 border border-green-200',
    };
    return map[p];
  }

  getStatutClasses(s: StatutBesoin): string {
    const map: Record<StatutBesoin, string> = {
      IDENTIFIE: 'bg-blue-100 text-blue-700 border border-blue-200',
      PLANIFIE: 'bg-amber-100 text-amber-700 border border-amber-200',
      REALISE: 'bg-green-100 text-green-700 border border-green-200',
    };
    return map[s];
  }

  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadBesoins(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.loadBesoins(); } }
  trackById(_: number, b: BesoinFormation): string { return b.id ?? b.employeId + b.competenceLacune; }

  private handleError(err: any): void {
    console.error(err);
    if (err?.status === 0) this.toastr.error('Serveur injoignable.', 'Erreur réseau');
    else this.toastr.error('Une erreur est survenue.', 'Erreur');
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
