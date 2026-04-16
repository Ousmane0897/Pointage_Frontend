import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { CongeService } from '../../../../../services/conge.service';
import {
  DemandeConge,
  StatutDemande,
  TypeConge,
} from '../../../../../models/conge.model';
import { PageResponse } from '../../../../../models/pageResponse.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-validation-conges',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './validation-conges.component.html',
  styleUrl: './validation-conges.component.scss',
})
export class ValidationCongesComponent implements OnInit, OnDestroy {

  demandes: DemandeConge[] = [];
  total = 0;
  totalPages = 0;
  page = 0;
  size = 10;
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private congeService: CongeService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.congeService.listerDemandes(this.page, this.size, { statut: 'EN_ATTENTE' })
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<DemandeConge>);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.demandes = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  approuver(d: DemandeConge): void {
    if (!d.id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { message: `Approuver la demande de ${d.prenom} ${d.nom} (${d.nombreJours ?? '?'} j) ?` },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.congeService.approuver(d.id!).pipe(
        catchError(err => { this.handleError(err); return of(null); }),
        takeUntil(this.destroy$),
      ).subscribe(res => {
        if (!res) return;
        this.toastr.success('Demande approuvée.', 'Succès');
        this.load();
      });
    });
  }

  refuser(d: DemandeConge): void {
    if (!d.id) return;
    const motif = window.prompt('Motif du refus :')?.trim();
    if (!motif) return;
    this.congeService.refuser(d.id, motif).pipe(
      catchError(err => { this.handleError(err); return of(null); }),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      if (!res) return;
      this.toastr.success('Demande refusée.', 'Succès');
      this.load();
    });
  }

  retour(): void { this.router.navigate(['/admin/rh/temps-et-presences/conges']); }

  getTypeLabel(t: TypeConge): string {
    const map: Record<TypeConge, string> = {
      ANNUEL: 'Annuel', MATERNITE: 'Maternité', PATERNITE: 'Paternité',
      SANS_SOLDE: 'Sans solde', EXCEPTIONNEL: 'Exceptionnel',
    };
    return map[t];
  }

  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.load(); } }
  prevPage(): void { if (this.page > 0) { this.page--; this.load(); } }

  trackById(_: number, d: DemandeConge): string { return d.id ?? `${d.employeId}-${d.dateDebut}`; }

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
