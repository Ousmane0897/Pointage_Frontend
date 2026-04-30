import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  Subject,
  BehaviorSubject,
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
  finalize,
} from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { ContratService } from '../../../../../services/contrat.service';
import { Contrat, AlerteContrat, TypeContrat } from '../../../../../models/contrat.model';
import { PageResponse } from '../../../../../models/pageResponse.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-liste-contrats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './liste-contrats.component.html',
  styleUrl: './liste-contrats.component.scss',
})
export class ListeContratsComponent implements OnInit, OnDestroy {

  // ─── Données ─────────────────────────────────────────────────────────────
  contrats: Contrat[] = [];
  alertes: AlerteContrat[] = [];
  total = 0;
  totalPages = 0;

  // ─── Pagination ───────────────────────────────────────────────────────────
  page = 0;
  size = 10;

  // ─── Recherche ────────────────────────────────────────────────────────────
  searchQuery = '';
  private searchSubject = new BehaviorSubject<string>('');

  // ─── Filtre type contrat ──────────────────────────────────────────────────
  selectedType: TypeContrat | '' = '';

  // ─── États UI ─────────────────────────────────────────────────────────────
  loading = false;
  errorMessage = '';
  alertesDismissed = false;

  // ─── Cycle de vie ─────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private contratService: ContratService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadAlertes();
    this.setupSearch();
  }

  // ─── Chargement des alertes ───────────────────────────────────────────────
  private loadAlertes(): void {
    this.contratService
      .getAlertes()
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe(alertes => {
        this.alertes = alertes;
      });
  }

  // ─── Recherche réactive ───────────────────────────────────────────────────
  private setupSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(q => {
          this.page = 0;
          this.loading = true;
          this.errorMessage = '';
          return this.contratService
            .getContrats(this.page, this.size, q, this.selectedType || undefined)
            .pipe(
              catchError(err => {
                this.handleError(err);
                return of({ content: [], totalElements: 0 } as PageResponse<Contrat>);
              }),
              finalize(() => (this.loading = false)),
            );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.contrats = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  // ─── Chargement paginé direct ─────────────────────────────────────────────
  loadContrats(): void {
    this.loading = true;
    this.errorMessage = '';

    this.contratService
      .getContrats(this.page, this.size, this.searchQuery, this.selectedType || undefined)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<Contrat>);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.contrats = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  // ─── Recherche ────────────────────────────────────────────────────────────
  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  // ─── Filtre type ──────────────────────────────────────────────────────────
  applyTypeFilter(): void {
    this.page = 0;
    this.loadContrats();
  }

  resetFilters(): void {
    this.selectedType = '';
    this.searchQuery = '';
    this.page = 0;
    this.searchSubject.next('');
  }

  // ─── Pagination ───────────────────────────────────────────────────────────
  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.loadContrats();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadContrats();
    }
  }

  goToPage(p: number): void {
    if (p >= 0 && p < this.totalPages) {
      this.page = p;
      this.loadContrats();
    }
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  navigateToCreation(): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/contrats/nouveau']);
  }

  navigateToModification(id: string): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/contrats', id, 'modifier']);
  }

  navigateToAvenants(contratId: string): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/contrats', contratId, 'avenants']);
  }

  // ─── Suppression ──────────────────────────────────────────────────────────
  supprimerContrat(contrat: Contrat): void {
    const nomComplet = `${contrat.employePrenom ?? ''} ${contrat.employeNom ?? ''}`.trim();
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Êtes-vous sûr de vouloir supprimer le contrat de ${nomComplet} (${contrat.typeContrat}) ? Cette action est irréversible.`,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(confirmed => {
        if (confirmed) {
          this.contratService
            .supprimerContrat(contrat.id!)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.toastr.success('Contrat supprimé avec succès.', 'Succès');
                this.loadContrats();
              },
              error: err => {
                console.error('Erreur suppression contrat :', err);
                this.toastr.error('Erreur lors de la suppression du contrat.', 'Erreur');
              },
            });
        }
      });
  }

  // ─── Badges helpers ───────────────────────────────────────────────────────
  getTypeBadgeClasses(type: string): string {
    const map: Record<string, string> = {
      CDI: 'bg-blue-100 text-blue-700 border border-blue-200',
      CDD: 'bg-amber-100 text-amber-700 border border-amber-200',
      STAGE: 'bg-purple-100 text-purple-700 border border-purple-200',
      PRESTATION: 'bg-teal-100 text-teal-700 border border-teal-200',
    };
    return map[type] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  getStatutBadgeClasses(statut: string): string {
    const map: Record<string, string> = {
      ACTIF: 'bg-green-100 text-green-700 border border-green-200',
      EXPIRE: 'bg-red-100 text-red-700 border border-red-200',
      RENOUVELE: 'bg-blue-100 text-blue-700 border border-blue-200',
      RESILIE: 'bg-gray-100 text-gray-600 border border-gray-200',
    };
    return map[statut] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  getStatutDotClasses(statut: string): string {
    const map: Record<string, string> = {
      ACTIF: 'bg-green-500',
      EXPIRE: 'bg-red-500',
      RENOUVELE: 'bg-blue-500',
      RESILIE: 'bg-gray-400',
    };
    return map[statut] ?? 'bg-gray-400';
  }

  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      ACTIF: 'Actif',
      EXPIRE: 'Expiré',
      RENOUVELE: 'Renouvelé',
      RESILIE: 'Résilié',
    };
    return map[statut] ?? statut;
  }

  getAlerteBadgeColor(joursRestants: number): string {
    if (joursRestants <= 7) return 'text-red-700';
    if (joursRestants <= 30) return 'text-amber-700';
    return 'text-yellow-700';
  }

  dismissAlertes(): void {
    this.alertesDismissed = true;
  }

  // ─── Gestion des erreurs HTTP ─────────────────────────────────────────────
  private handleError(err: any): void {
    console.error('Erreur backend :', err);
    if (err.status === 0) {
      this.errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    } else if (err.status === 401) {
      this.errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
    } else if (err.status === 403) {
      this.errorMessage = "Accès refusé. Vous n'avez pas les droits nécessaires.";
    } else if (err.status === 404) {
      this.errorMessage = 'Ressource introuvable.';
    } else if (err.status === 500) {
      this.errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
    } else {
      this.errorMessage = `Erreur inattendue (${err.status ?? 'inconnu'}).`;
    }
    this.toastr.error(this.errorMessage, 'Erreur');
  }

  // ─── Utilitaires ──────────────────────────────────────────────────────────
  trackById(_: number, item: Contrat): string {
    return item.id ?? item.employeId;
  }

  // ─── Nettoyage ────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
