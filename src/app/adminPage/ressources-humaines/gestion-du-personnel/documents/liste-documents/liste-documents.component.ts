import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { DocumentEmployeService } from '../../../../../services/document-employe.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import { DocumentEmploye, CategorieDocument, StatutDocument } from '../../../../../models/document-employe.model';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';
import { PageResponse } from '../../../../../models/pageResponse.model';
import { LoginService } from '../../../../../services/login.service';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-liste-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './liste-documents.component.html',
  styleUrl: './liste-documents.component.scss',
})
export class ListeDocumentsComponent implements OnInit, OnDestroy {

  // ─── Données ─────────────────────────────────────────────────────────────
  documents: DocumentEmploye[] = [];
  employes: DossierEmploye[] = [];
  total = 0;
  totalPages = 0;

  // ─── Pagination ───────────────────────────────────────────────────────────
  page = 0;
  size = 10;

  // ─── Filtres ──────────────────────────────────────────────────────────────
  filtreEmployeId = '';
  filtreCategorie: CategorieDocument | '' = '';

  // ─── Rôle courant ─────────────────────────────────────────────────────────
  currentRole = '';

  // ─── Formulaire d'upload ──────────────────────────────────────────────────
  showUploadForm = false;
  newDocument: {
    employeId: string;
    nom: string;
    categorie: CategorieDocument | '';
    dateExpiration: string;
  } = {
    employeId: '',
    nom: '',
    categorie: '',
    dateExpiration: '',
  };
  selectedFile: File | null = null;
  dragOver = false;
  uploading = false;

  // ─── États UI ─────────────────────────────────────────────────────────────
  loading = false;

  // ─── Cycle de vie ─────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private documentService: DocumentEmployeService,
    private dossierService: DossierEmployeService,
    private router: Router,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private loginService: LoginService,
  ) {}

  ngOnInit(): void {
    this.currentRole = this.loginService.getUserRole();
    this.loadEmployes();
    this.loadDocuments();
  }

  // ─── Chargement des employés (pour les selects) ───────────────────────────
  private loadEmployes(): void {
    this.dossierService
      .getEmployes(0, 200)
      .pipe(
        catchError(() => of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.employes = res.content;
      });
  }

  // ─── Chargement des documents ─────────────────────────────────────────────
  loadDocuments(): void {
    this.loading = true;

    this.documentService
      .getDocuments(
        this.page,
        this.size,
        this.filtreEmployeId || undefined,
        this.filtreCategorie || undefined,
      )
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of({ content: [], totalElements: 0 } as PageResponse<DocumentEmploye>);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        this.documents = res.content;
        this.total = res.totalElements ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
      });
  }

  // ─── Filtres ──────────────────────────────────────────────────────────────
  applyFilters(): void {
    this.page = 0;
    this.loadDocuments();
  }

  resetFilters(): void {
    this.filtreEmployeId = '';
    this.filtreCategorie = '';
    this.page = 0;
    this.loadDocuments();
  }

  // ─── Upload ───────────────────────────────────────────────────────────────
  toggleUploadForm(): void {
    this.showUploadForm = !this.showUploadForm;
    if (!this.showUploadForm) {
      this.resetUploadForm();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
    }
  }

  uploadDocument(form: NgForm): void {
    if (form.invalid || !this.selectedFile || !this.newDocument.categorie) {
      this.toastr.warning('Veuillez remplir tous les champs obligatoires et sélectionner un fichier.', 'Formulaire incomplet');
      return;
    }

    this.uploading = true;
    const formData = new FormData();
    formData.append('employeId', this.newDocument.employeId);
    formData.append('nom', this.newDocument.nom);
    formData.append('categorie', this.newDocument.categorie);
    if (this.newDocument.dateExpiration) {
      formData.append('dateExpiration', this.newDocument.dateExpiration);
    }
    formData.append('fichier', this.selectedFile);

    this.documentService
      .uploadDocument(formData)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of(null);
        }),
        finalize(() => (this.uploading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(res => {
        if (res !== null) {
          this.toastr.success('Document uploadé avec succès.', 'Succès');
          this.showUploadForm = false;
          this.resetUploadForm();
          this.page = 0;
          this.loadDocuments();
        }
      });
  }

  private resetUploadForm(): void {
    this.newDocument = { employeId: '', nom: '', categorie: '', dateExpiration: '' };
    this.selectedFile = null;
  }

  // ─── Téléchargement ───────────────────────────────────────────────────────
  telechargerDocument(id: string): void {
    this.documentService
      .telechargerDocument(id)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(blob => {
        if (!blob) return;
        const doc = this.documents.find(d => d.id === id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc?.nom ?? 'document';
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  // ─── Visualisation ────────────────────────────────────────────────────────
  visualiserDocument(id: string): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/documents/visualiser', id]);
  }

  // ─── Validation / Refus ───────────────────────────────────────────────────
  validerDocument(id: string, statut: 'VALIDE' | 'REFUSE'): void {
    const label = statut === 'VALIDE' ? 'valider' : 'refuser';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Êtes-vous sûr de vouloir ${label} ce document ?`,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(confirmed => {
        if (!confirmed) return;

        this.documentService
          .validerDocument(id, statut)
          .pipe(
            catchError(err => {
              this.handleError(err);
              return of(null);
            }),
            takeUntil(this.destroy$),
          )
          .subscribe(res => {
            if (res !== null) {
              const msg = statut === 'VALIDE' ? 'Document validé avec succès.' : 'Document refusé.';
              this.toastr.success(msg, 'Succès');
              this.loadDocuments();
            }
          });
      });
  }

  // ─── Suppression ──────────────────────────────────────────────────────────
  supprimerDocument(id: string): void {
    const doc = this.documents.find(d => d.id === id);
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Êtes-vous sûr de vouloir supprimer le document "${doc?.nom ?? ''}" ? Cette action est irréversible.`,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(confirmed => {
        if (!confirmed) return;

        this.documentService
          .supprimerDocument(id)
          .pipe(
            catchError(err => {
              this.handleError(err);
              return of(null);
            }),
            takeUntil(this.destroy$),
          )
          .subscribe(() => {
            this.toastr.success('Document supprimé avec succès.', 'Succès');
            if (this.documents.length === 1 && this.page > 0) {
              this.page--;
            }
            this.loadDocuments();
          });
      });
  }

  // ─── Helpers badges ───────────────────────────────────────────────────────
  getCategorieLabel(categorie: CategorieDocument): string {
    const map: Record<CategorieDocument, string> = {
      CNI: "Carte d'identité",
      DIPLOME: 'Diplôme',
      CERTIFICAT: 'Certificat',
      ATTESTATION: 'Attestation',
      CONTRAT: 'Contrat',
      AUTRE: 'Autre',
    };
    return map[categorie] ?? categorie;
  }

  getCategorieClasses(categorie: CategorieDocument): string {
    const map: Record<CategorieDocument, string> = {
      CNI: 'bg-blue-100 text-blue-700 border border-blue-200',
      DIPLOME: 'bg-purple-100 text-purple-700 border border-purple-200',
      CERTIFICAT: 'bg-green-100 text-green-700 border border-green-200',
      ATTESTATION: 'bg-amber-100 text-amber-700 border border-amber-200',
      CONTRAT: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
      AUTRE: 'bg-gray-100 text-gray-600 border border-gray-200',
    };
    return map[categorie] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  getCategorieIcon(categorie: CategorieDocument): string {
    const map: Record<CategorieDocument, string> = {
      CNI: 'CreditCard',
      DIPLOME: 'GraduationCap',
      CERTIFICAT: 'Award',
      ATTESTATION: 'FileCheck',
      CONTRAT: 'FileSignature',
      AUTRE: 'File',
    };
    return map[categorie] ?? 'File';
  }

  getStatutClasses(statut: StatutDocument): string {
    const map: Record<StatutDocument, string> = {
      VALIDE: 'bg-green-100 text-green-700 border border-green-200',
      EN_ATTENTE: 'bg-amber-100 text-amber-700 border border-amber-200',
      REFUSE: 'bg-red-100 text-red-700 border border-red-200',
      EXPIRE: 'bg-gray-100 text-gray-500 border border-gray-200',
    };
    return map[statut] ?? 'bg-gray-100 text-gray-500 border border-gray-200';
  }

  getStatutDotClasses(statut: StatutDocument): string {
    const map: Record<StatutDocument, string> = {
      VALIDE: 'bg-green-500',
      EN_ATTENTE: 'bg-amber-500',
      REFUSE: 'bg-red-500',
      EXPIRE: 'bg-gray-400',
    };
    return map[statut] ?? 'bg-gray-400';
  }

  getStatutLabel(statut: StatutDocument): string {
    const map: Record<StatutDocument, string> = {
      VALIDE: 'Validé',
      EN_ATTENTE: 'En attente',
      REFUSE: 'Refusé',
      EXPIRE: 'Expiré',
    };
    return map[statut] ?? statut;
  }

  isRH(): boolean {
    return this.currentRole === 'RH' || this.currentRole === 'ADMIN' || this.currentRole === 'SUPER_ADMIN';
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return '–';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  // ─── Pagination ───────────────────────────────────────────────────────────
  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.loadDocuments();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadDocuments();
    }
  }

  goToPage(p: number): void {
    if (p >= 0 && p < this.totalPages) {
      this.page = p;
      this.loadDocuments();
    }
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  // ─── Gestion des erreurs ──────────────────────────────────────────────────
  private handleError(err: any): void {
    console.error('Erreur:', err);
    if (err?.status === 0) {
      this.toastr.error('Impossible de contacter le serveur.', 'Erreur réseau');
    } else if (err?.status === 403) {
      this.toastr.error("Accès refusé. Vous n'avez pas les droits nécessaires.", 'Accès refusé');
    } else if (err?.status === 404) {
      this.toastr.error('Document introuvable.', 'Erreur');
    } else {
      this.toastr.error('Une erreur est survenue. Veuillez réessayer.', 'Erreur');
    }
  }

  // ─── Track by ─────────────────────────────────────────────────────────────
  trackById(_: number, item: DocumentEmploye): string {
    return item.id ?? item.nom;
  }

  // ─── Nettoyage ────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
