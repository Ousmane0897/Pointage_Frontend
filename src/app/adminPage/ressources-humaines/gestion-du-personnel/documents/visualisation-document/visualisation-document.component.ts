import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { Subject, switchMap, catchError, of, takeUntil, finalize } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { DocumentEmployeService } from '../../../../../services/document-employe.service';
import { DocumentEmploye, CategorieDocument, StatutDocument } from '../../../../../models/document-employe.model';

@Component({
  selector: 'app-visualisation-document',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './visualisation-document.component.html',
  styleUrl: './visualisation-document.component.scss',
})
export class VisualisationDocumentComponent implements OnInit, OnDestroy {

  // ─── Données ─────────────────────────────────────────────────────────────
  document: DocumentEmploye | null = null;
  documentId: string | null = null;

  // ─── Prévisualisation ─────────────────────────────────────────────────────
  previewUrl: SafeUrl | null = null;
  rawBlob: Blob | null = null;

  // ─── États UI ─────────────────────────────────────────────────────────────
  loading = false;
  loadingPreview = false;
  isImage = false;
  isPdf = false;
  previewError = false;

  // ─── Cycle de vie ─────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();
  private objectUrl: string | null = null;

  constructor(
    private documentService: DocumentEmployeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = params.get('id');
        if (!id) {
          this.toastr.error('Identifiant de document manquant.', 'Erreur');
          this.goBack();
          return;
        }
        this.documentId = id;
        this.loadDocumentPreview(id);
      });
  }

  // ─── Chargement métadonnées + blob ────────────────────────────────────────
  private loadDocumentPreview(id: string): void {
    this.loading = true;
    this.loadingPreview = true;
    this.previewError = false;

    // On télécharge le blob pour la prévisualisation
    this.documentService
      .telechargerDocument(id)
      .pipe(
        catchError(err => {
          this.handleError(err);
          this.previewError = true;
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          this.loadingPreview = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(blob => {
        if (!blob) return;
        this.rawBlob = blob;
        this.detectTypeAndBuildPreview(blob);
      });
  }

  private detectTypeAndBuildPreview(blob: Blob): void {
    const mime = blob.type.toLowerCase();

    this.isImage = mime.startsWith('image/');
    this.isPdf = mime === 'application/pdf';

    // Libérer l'URL précédente si elle existe
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }

    this.objectUrl = URL.createObjectURL(blob);

    if (this.isImage || this.isPdf) {
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
    } else {
      this.previewUrl = null;
    }
  }

  // ─── Téléchargement ───────────────────────────────────────────────────────
  telecharger(): void {
    if (this.rawBlob) {
      const url = URL.createObjectURL(this.rawBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.document?.nom ?? `document-${this.documentId}`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (!this.documentId) return;

    this.documentService
      .telechargerDocument(this.documentId)
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.document?.nom ?? `document-${this.documentId}`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  goBack(): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/documents']);
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

  formatFileSize(bytes?: number): string {
    if (!bytes) return '–';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  getMimeLabel(mime?: string): string {
    if (!mime) return '–';
    const map: Record<string, string> = {
      'application/pdf': 'PDF',
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPEG',
      'image/png': 'PNG',
      'application/msword': 'Word (.doc)',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (.docx)',
      'application/vnd.ms-excel': 'Excel (.xls)',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel (.xlsx)',
    };
    return map[mime] ?? mime;
  }

  // ─── Gestion des erreurs ──────────────────────────────────────────────────
  private handleError(err: any): void {
    console.error('Erreur:', err);
    if (err?.status === 0) {
      this.toastr.error('Impossible de contacter le serveur.', 'Erreur réseau');
    } else if (err?.status === 404) {
      this.toastr.error('Document introuvable.', 'Erreur');
    } else {
      this.toastr.error('Erreur lors du chargement du document.', 'Erreur');
    }
  }

  // ─── Nettoyage ────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
