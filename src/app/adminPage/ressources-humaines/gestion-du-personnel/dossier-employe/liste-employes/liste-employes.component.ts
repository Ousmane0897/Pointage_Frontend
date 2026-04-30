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

import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import { DossierEmploye, FiltreEmploye } from '../../../../../models/dossier-employe.model';
import { PageResponse } from '../../../../../models/pageResponse.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';
import { ImportExcelModalComponent } from '../import-excel-modal/import-excel-modal.component';
import { ResultatImport } from '../../../../../models/import-employe.model';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-liste-employes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './liste-employes.component.html',
  styleUrl: './liste-employes.component.scss',
})
export class ListeEmployesComponent implements OnInit, OnDestroy {

  // ─── Données ─────────────────────────────────────────────────────────────
  employes: DossierEmploye[] = [];
  total = 0;
  totalPages = 0;

  // ─── Photos (id employé → ObjectURL local) ───────────────────────────────
  photoUrls: Record<string, string> = {};

  // ─── baseUrl ─────────────────────────────────────────────────
   baseUrl: string = environment.apiUrl;
  // ─── Pagination ───────────────────────────────────────────────────────────
  page = 0;
  size = 10;

  // ─── Recherche ────────────────────────────────────────────────────────────
  searchQuery = '';
  private searchSubject = new BehaviorSubject<string>('');

  // ─── Filtres ──────────────────────────────────────────────────────────────
  filtres: FiltreEmploye = {};
  departements: string[] = [];
  sites: string[] = [];
  postes: string[] = [];

  // ─── États UI ─────────────────────────────────────────────────────────────
  loading = false;
  errorMessage = '';

  // ─── Cycle de vie ─────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private dossierEmployeService: DossierEmployeService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadFilterOptions();
    this.setupSearch();
  }

  // ─── Chargement des options de filtres ────────────────────────────────────
  private loadFilterOptions(): void {
    this.dossierEmployeService
      .getValeursFiltres()
      .pipe(
        catchError(() => of({ departements: [], sites: [], postes: [] })),
        takeUntil(this.destroy$),
      )
      .subscribe(({ departements, sites, postes }) => {
        this.departements = departements;
        this.sites = sites;
        this.postes = postes;
      });
  }

  // ─── Initialisation de la recherche réactive ──────────────────────────────
  private setupSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(q => {
          this.page = 0;
          this.loading = true;
          this.errorMessage = '';
          const filtresCombines: FiltreEmploye = { ...this.filtres, q };
          return this.dossierEmployeService.getEmployes(this.page, this.size, filtresCombines).pipe(
            catchError(err => {
              this.handleError(err);
              return of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>);
            }),
            finalize(() => (this.loading = false)),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.employes = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
        this.chargerPhotos();
      });
  }

  // ─── Chargement paginé direct ─────────────────────────────────────────────
  loadEmployes(): void {
    this.loading = true;
    this.errorMessage = '';
    const filtresCombines: FiltreEmploye = { ...this.filtres, q: this.searchQuery };

    this.dossierEmployeService
      .getEmployes(this.page, this.size, filtresCombines)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.employes = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
        this.chargerPhotos();
      });
  }

  // ─── Chargement des photos (via endpoint protégé par JWT) ────────────────
  private chargerPhotos(): void {
    this.revoquerPhotoUrls();
    this.employes
      .filter(e => !!e.id && !!e.photoUrl)
      .forEach(e => {
        this.dossierEmployeService
          .getPhotoBlob(e.id!)
          .pipe(
            catchError(() => of(null)),
            takeUntil(this.destroy$),
          )
          .subscribe(blob => { 
            if (blob) {
              this.photoUrls[e.id!] = URL.createObjectURL(blob);
            }
          });
      });
  }
  
  // ─── Libération des ObjectURLs pour éviter les fuites de mémoire ─────────────
  private revoquerPhotoUrls(): void {
    Object.values(this.photoUrls).forEach(url => URL.revokeObjectURL(url));
    this.photoUrls = {};
  }

  // ─── Recherche ────────────────────────────────────────────────────────────
  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  // ─── Filtres ──────────────────────────────────────────────────────────────
  applyFilters(): void {
    this.page = 0;
    this.loadEmployes();
  }

  resetFilters(): void {
    this.filtres = {};
    this.searchQuery = '';
    this.page = 0;
    this.searchSubject.next('');
  }

  // ─── Pagination ───────────────────────────────────────────────────────────
  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.loadEmployes();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadEmployes();
    }
  }

  goToPage(p: number): void {
    if (p >= 0 && p < this.totalPages) {
      this.page = p;
      this.loadEmployes();
    }
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  navigateToFiche(id: string): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/dossier-employe/fiche', id]);
  }

  navigateToCreation(): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/dossier-employe/nouveau']);
  }

  navigateToModification(id: string): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/dossier-employe/modifier', id]);
  }

  // ─── Import Excel ─────────────────────────────────────────────────────────
  ouvrirImportExcel(): void {
    const dialogRef = this.dialog.open(ImportExcelModalComponent, {
      width: 'auto',
      maxWidth: '92vw',
      panelClass: 'import-excel-dialog-panel',
      autoFocus: false,
      disableClose: true,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultat: ResultatImport | null | undefined) => {
        if (resultat && resultat.succes > 0) {
          this.page = 0;
          this.loadEmployes();
        }
      });
  }

  // ─── Suppression ──────────────────────────────────────────────────────────
  supprimerEmploye(id: string, nomComplet: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { message: `Êtes-vous sûr de vouloir supprimer le dossier de ${nomComplet} ? Cette action est irréversible.` },
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (confirmed) {
        this.dossierEmployeService
          .supprimerEmploye(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success(`Le dossier de ${nomComplet} a été supprimé avec succès.`, 'Succès');
              this.loadEmployes();
            },
            error: err => {
              console.error('Erreur suppression :', err);
              this.toastr.error('Erreur lors de la suppression du dossier employé.', 'Erreur');
            },
          });
      }
    });
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
      this.errorMessage = `Erreur inattendue (${err.status}).`;
    }
    this.toastr.error(this.errorMessage, 'Erreur');
  }

  // ─── Utilitaires ──────────────────────────────────────────────────────────
  trackById(_: number, item: DossierEmploye): string {
    return item.id ?? item.matricule;
  }

  // ─── Nettoyage ────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this.revoquerPhotoUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
