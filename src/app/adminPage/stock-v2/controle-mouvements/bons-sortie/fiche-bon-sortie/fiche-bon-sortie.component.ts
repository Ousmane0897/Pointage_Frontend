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
import { Observable, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2BonSortieService } from '../../../../../services/stock-v2-bon-sortie.service';
import { StockV2BonPermissionsService } from '../../../../../services/stock-v2-bon-permissions.service';
import { StockV2PdfService } from '../../../../../services/stock-v2-pdf.service';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';
import { TimelineWorkflowComponent } from '../../shared/timeline-workflow/timeline-workflow.component';
import {
  SuppressionDefinitiveDialogComponent,
  SuppressionDefinitiveDialogResult,
} from '../../../shared/dialogs/suppression-definitive-dialog.component';
import { BonSortie, Destinataire } from '../../../../../models/stock-v2-bon-sortie.model';
import {
  LIBELLES_TYPE_SORTIE,
  COULEURS_TYPE_SORTIE,
  LIBELLES_STATUT_BON,
  COULEURS_STATUT_BON,
  LIBELLES_TYPE_DESTINATAIRE,
  LIBELLES_UNITE,
  DEVISE,
} from '../../../../../constants/stock.constants';

/**
 * Fiche d'un bon de sortie — Module Stock v2 / 7.4 (fonctionnalité 3 + 5).
 */
@Component({
  selector: 'app-fiche-bon-sortie',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, TimelineWorkflowComponent],
  templateUrl: './fiche-bon-sortie.component.html',
  styleUrl: './fiche-bon-sortie.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FicheBonSortieComponent implements OnInit, OnDestroy {

  bon: BonSortie | null = null;
  loading = false;
  action = false;

  afficherModalRefus = false;
  commentaireRefus = new FormControl<string>('', { nonNullable: true, validators: [Validators.required] });

  readonly LIBELLES_TYPE_SORTIE = LIBELLES_TYPE_SORTIE;
  readonly COULEURS_TYPE_SORTIE = COULEURS_TYPE_SORTIE;
  readonly LIBELLES_STATUT_BON = LIBELLES_STATUT_BON;
  readonly COULEURS_STATUT_BON = COULEURS_STATUT_BON;
  readonly LIBELLES_TYPE_DESTINATAIRE = LIBELLES_TYPE_DESTINATAIRE;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly DEVISE = DEVISE;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: StockV2BonSortieService,
    readonly perms: StockV2BonPermissionsService,
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
        next: bon => {
          if (!this.perms.peutConsulter(bon)) {
            this.toastr.warning('Vous ne pouvez consulter que vos propres bons.');
            this.router.navigate(['/admin/stock-v2/controle-mouvements/bons-sortie']);
            return;
          }
          this.bon = bon;
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastr.error('Bon introuvable.');
          this.router.navigate(['/admin/stock-v2/controle-mouvements/bons-sortie']);
        },
      });
  }

  libelleDestinataire(d: Destinataire | undefined): string {
    if (!d) return '—';
    const nom = d.siteNom ?? d.agentNom ?? d.clientNom ?? '—';
    return `${nom} (${LIBELLES_TYPE_DESTINATAIRE[d.type]})`;
  }

  telechargerPdf(): void {
    if (this.bon) this.pdfService.genererBonSortie(this.bon);
  }

  soumettre(): void {
    if (!this.bon?.id || !this.perms.peutSoumettreBon(this.bon)) return;
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
    if (!this.bon?.id || !this.perms.peutValider()) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        message: 'Valider ce bon ? Cette action décrémente le stock (mouvements de sortie) et est irréversible.',
        confirmLabel: 'Valider',
        confirmColor: 'primary',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.executer(this.service.valider(this.bon!.id!), 'Bon validé — mouvements générés.');
    });
  }

  /** Renvoie un bon refusé en brouillon pour que son créateur le corrige. */
  reprendre(): void {
    if (!this.bon?.id || !this.perms.peutReprendre(this.bon)) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        message: 'Reprendre ce bon ? Il repassera en brouillon pour correction, puis devra être soumis à nouveau. L\'historique du refus est conservé.',
        confirmLabel: 'Reprendre',
        confirmColor: 'primary',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.executer(this.service.reprendre(this.bon!.id!), 'Bon repassé en brouillon — vous pouvez le corriger.');
    });
  }

  /**
   * Suppression d'un bon déjà engagé — SUPERADMIN seul. Le serveur contre-passe les mouvements de
   * sortie ; on revient à la liste, la fiche n'ayant plus d'objet.
   */
  supprimerDefinitivement(): void {
    const bon = this.bon;
    if (!bon?.id || !this.perms.peutSupprimerDefinitivement(bon)) return;
    this.dialog.open<SuppressionDefinitiveDialogComponent, unknown, SuppressionDefinitiveDialogResult | null>(
      SuppressionDefinitiveDialogComponent, {
        width: '480px',
        data: {
          titre: 'Supprimer le bon de sortie',
          reference: bon.reference,
          effetStock: bon.statut === 'EFFECTIF'
            ? 'Les mouvements de sortie sont contre-passés : les quantités sorties sont recréditées au site source.'
            : 'Ce bon n’a pas encore mouvementé le stock : aucune quantité ne sera modifiée.',
        },
      }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(res => {
        if (!res) return;
        this.action = true;
        this.service.supprimerDefinitivement(bon.id!, res.motif)
          .pipe(finalize(() => { this.action = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success('Bon supprimé et stock rétabli.');
              this.router.navigate(['/admin/stock-v2/controle-mouvements/bons-sortie']);
            },
            error: err => {
              if (err?.status === 403) this.toastr.error('Action non autorisée pour votre profil.');
              else this.toastr.error(err?.error?.message ?? 'Suppression impossible.');
            },
          });
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
    if (!this.bon?.id || !this.perms.peutValider()) return;
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

  private executer(obs: Observable<BonSortie>, msg: string): void {
    this.action = true;
    obs.pipe(finalize(() => { this.action = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: bon => { this.bon = bon; this.toastr.success(msg); this.cdr.markForCheck(); },
        error: err => {
          if (err?.status === 422) this.toastr.error('Stock insuffisant pour générer les mouvements.');
          else if (err?.status === 403) this.toastr.error("Action non autorisée pour votre profil.");
          else if (err?.status === 409) this.toastr.error('Le statut de ce bon a changé entre-temps. Rechargez la page.');
          else this.toastr.error("L'action a échoué.");
        },
      });
  }

  trackByIndex(i: number): number { return i; }
}
