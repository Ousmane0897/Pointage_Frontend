import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2BonEntreeService } from '../../../../../services/stock-v2-bon-entree.service';
import { StockV2PdfService } from '../../../../../services/stock-v2-pdf.service';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';
import { TimelineWorkflowComponent } from '../../shared/timeline-workflow/timeline-workflow.component';
import { BonEntree } from '../../../../../models/stock-v2-bon-entree.model';
import {
  LIBELLES_TYPE_ENTREE,
  COULEURS_TYPE_ENTREE,
  LIBELLES_STATUT_BON,
  COULEURS_STATUT_BON,
  LIBELLES_UNITE,
  DEVISE,
} from '../../../../../constants/stock.constants';

/**
 * Fiche d'un bon d'entrée — Module Stock v2 / 7.4 (fonctionnalité 4 + 5).
 *
 * Détail complet, timeline du workflow, génération PDF et actions de
 * transition (soumettre / valider / refuser). La validation déclenche les
 * mouvements de stock côté serveur (confirmation obligatoire).
 */
@Component({
  selector: 'app-fiche-bon-entree',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, TimelineWorkflowComponent],
  templateUrl: './fiche-bon-entree.component.html',
  styleUrl: './fiche-bon-entree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FicheBonEntreeComponent implements OnInit, OnDestroy {

  bon: BonEntree | null = null;
  loading = false;
  action = false;

  afficherModalRefus = false;
  commentaireRefus = new FormControl<string>('', { nonNullable: true, validators: [Validators.required] });

  readonly LIBELLES_TYPE_ENTREE = LIBELLES_TYPE_ENTREE;
  readonly COULEURS_TYPE_ENTREE = COULEURS_TYPE_ENTREE;
  readonly LIBELLES_STATUT_BON = LIBELLES_STATUT_BON;
  readonly COULEURS_STATUT_BON = COULEURS_STATUT_BON;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly DEVISE = DEVISE;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: StockV2BonEntreeService,
    private pdfService: StockV2PdfService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.charger(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(id: string): void {
    this.loading = true;
    this.service.getById(id)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: bon => { this.bon = bon; this.cdr.markForCheck(); },
        error: () => {
          this.toastr.error('Bon introuvable.');
          this.router.navigate(['/admin/stock-v2/controle-mouvements/bons-entree']);
        },
      });
  }

  telechargerPdf(): void {
    if (this.bon) this.pdfService.genererBonEntree(this.bon);
  }

  soumettre(): void {
    if (!this.bon?.id) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        message: 'Soumettre ce bon pour validation ? Il ne sera plus modifiable.',
        confirmLabel: 'Soumettre',
        confirmColor: 'primary',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.executer(this.service.soumettre(this.bon!.id!), 'Bon soumis pour validation.');
    });
  }

  valider(): void {
    if (!this.bon?.id) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        message: 'Valider ce bon ? Cette action génère les mouvements de stock correspondants et est irréversible.',
        confirmLabel: 'Valider',
        confirmColor: 'primary',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.executer(this.service.valider(this.bon!.id!), 'Bon validé — mouvements générés.');
    });
  }

  ouvrirRefus(): void {
    this.commentaireRefus.reset('');
    this.afficherModalRefus = true;
    this.cdr.markForCheck();
  }

  fermerRefus(): void {
    this.afficherModalRefus = false;
    this.cdr.markForCheck();
  }

  confirmerRefus(): void {
    if (!this.bon?.id) return;
    if (this.commentaireRefus.invalid) {
      this.commentaireRefus.markAsTouched();
      this.toastr.warning('Le motif de refus est obligatoire.');
      return;
    }
    this.afficherModalRefus = false;
    this.executer(
      this.service.refuser(this.bon.id, { commentaire: this.commentaireRefus.value.trim() }),
      'Bon refusé.',
    );
  }

  private executer(obs: import('rxjs').Observable<BonEntree>, msg: string): void {
    this.action = true;
    obs.pipe(finalize(() => { this.action = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: bon => { this.bon = bon; this.toastr.success(msg); this.cdr.markForCheck(); },
        error: err => {
          if (err?.status === 422) this.toastr.error('Stock insuffisant pour générer les mouvements.');
          else this.toastr.error("L'action a échoué.");
        },
      });
  }

  trackByIndex(i: number): number { return i; }
}
