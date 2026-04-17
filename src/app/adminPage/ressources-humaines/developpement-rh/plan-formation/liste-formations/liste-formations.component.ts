import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { FormationService } from '../../../../../services/formation.service';
import { Formation, FiltreFormation } from '../../../../../models/formation.model';
import { PageResponse } from '../../../../../models/pageResponse.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-liste-formations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './liste-formations.component.html',
  styleUrl: './liste-formations.component.scss',
})
export class ListeFormationsComponent implements OnInit, OnDestroy {

  formations: Formation[] = [];
  total = 0;
  totalPages = 0;
  page = 0;
  size = 10;
  loading = false;

  filtres: FiltreFormation = { q: '', actif: undefined };

  private destroy$ = new Subject<void>();

  constructor(
    private formationService: FormationService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadFormations();
  }

  loadFormations(): void {
    this.loading = true;
    const f: FiltreFormation = {
      q: this.filtres.q || undefined,
      actif: this.filtres.actif,
    };

    this.formationService
      .lister(this.page, this.size, f)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<Formation>);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.formations = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  applyFilters(): void { this.page = 0; this.loadFormations(); }
  resetFilters(): void {
    this.filtres = { q: '', actif: undefined };
    this.page = 0;
    this.loadFormations();
  }

  nouvelle(): void {
    this.router.navigate(['/admin/rh/developpement-rh/formations/nouvelle']);
  }

  modifier(f: Formation): void {
    if (!f.id) return;
    this.router.navigate(['/admin/rh/developpement-rh/formations', f.id, 'modifier']);
  }

  voirSessions(f: Formation): void {
    this.router.navigate(['/admin/rh/developpement-rh/formations/sessions'], { queryParams: { formationId: f.id } });
  }

  supprimer(f: Formation): void {
    if (!f.id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { message: `Supprimer la formation « ${f.titre} » ? Cette action est irréversible.` },
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (!confirmed) return;
      this.formationService.supprimer(f.id!).pipe(
        catchError(err => { this.handleError(err); return of(null); }),
        takeUntil(this.destroy$),
      ).subscribe(() => {
        this.toastr.success('Formation supprimée.', 'Succès');
        if (this.formations.length === 1 && this.page > 0) this.page--;
        this.loadFormations();
      });
    });
  }

  formatCout(montant: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(montant) + ' FCFA';
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadFormations(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.loadFormations(); } }

  trackById(_: number, f: Formation): string { return f.id ?? f.titre; }

  private handleError(err: any): void {
    console.error(err);
    if (err?.status === 0) this.toastr.error('Serveur injoignable.', 'Erreur réseau');
    else this.toastr.error('Une erreur est survenue.', 'Erreur');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
