import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';

import { BulletinPaieService } from '../../../../services/bulletin-paie.service';
import { BulletinPdfService } from '../../../../services/bulletin-pdf.service';
import { BulletinPaie } from '../../../../models/bulletin-paie.model';
import { PreviewBulletinComponent } from '../calcul-bulletin/preview-bulletin/preview-bulletin.component';

/**
 * Aperçu + téléchargement + impression d'un bulletin de paie au format PDF.
 * Le bulletin est soit récupéré depuis l'API (via :id),
 * soit fourni en mémoire via router state (depuis calcul-bulletin).
 */
@Component({
  selector: 'app-generation-bulletin',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, PreviewBulletinComponent],
  templateUrl: './generation-bulletin.component.html',
  styleUrl: './generation-bulletin.component.scss',
})
export class GenerationBulletinComponent implements OnInit, OnDestroy {

  bulletin: BulletinPaie | null = null;
  pdfUrl: SafeResourceUrl | null = null;
  loading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bulletinService: BulletinPaieService,
    private pdfService: BulletinPdfService,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const navState = this.router.getCurrentNavigation()?.extras?.state
      ?? (history.state as { bulletin?: BulletinPaie } | undefined);

    if (navState?.bulletin) {
      this.bulletin = navState.bulletin;
      this.genererApercu();
    } else if (id && id !== 'nouveau') {
      this.charger(id);
    } else {
      this.errorMessage = 'Aucun bulletin à afficher.';
    }
  }

  private charger(id: string): void {
    this.loading = true;
    this.bulletinService.getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: b => {
          this.bulletin = b;
          this.loading = false;
          this.genererApercu();
        },
        error: () => {
          this.errorMessage = 'Bulletin introuvable.';
          this.loading = false;
        },
      });
  }

  private genererApercu(): void {
    if (!this.bulletin) return;
    const rawUrl = this.pdfService.apercuBulletin(this.bulletin);
    this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
  }

  telecharger(): void {
    if (!this.bulletin) return;
    this.pdfService.telechargerBulletin(this.bulletin);
    this.toastr.success('Téléchargement du bulletin lancé.');
  }

  imprimer(): void {
    if (!this.bulletin) return;
    this.pdfService.imprimerBulletin(this.bulletin);
  }

  retour(): void {
    this.router.navigate(['/admin/rh/paie/historique']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
