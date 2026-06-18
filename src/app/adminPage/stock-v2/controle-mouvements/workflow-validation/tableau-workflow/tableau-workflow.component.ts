import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';

import { StockV2WorkflowService } from '../../../../../services/stock-v2-workflow.service';
import { WebsocketService } from '../../../../../services/websocket.service';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';
import {
  BonWorkflow,
  SensBon,
  StatutBon,
} from '../../../../../models/stock-v2-workflow.model';
import {
  LIBELLES_STATUT_BON,
  COULEURS_STATUT_BON,
  ORDRE_STATUTS_BON,
  DEVISE,
} from '../../../../../constants/stock.constants';

type Vue = 'kanban' | 'table';

interface ColonneKanban {
  statut: StatutBon;
  libelle: string;
  couleur: { bg: string; text: string; dot: string };
  bons: BonWorkflow[];
}

/**
 * Tableau de workflow — Module Stock v2 / 7.4 (fonctionnalité 5).
 *
 * Vue unifiée (Kanban + table) des bons d'entrée et de sortie par statut.
 * Notifications temps réel des soumissions/décisions via WebSocket. Actions de
 * validation/refus directement depuis le tableau (confirmation obligatoire,
 * commentaire requis au refus).
 */
@Component({
  selector: 'app-tableau-workflow',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './tableau-workflow.component.html',
  styleUrl: './tableau-workflow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableauWorkflowComponent implements OnInit, OnDestroy {

  bons: BonWorkflow[] = [];
  colonnes: ColonneKanban[] = [];
  loading = false;
  action = false;
  vue: Vue = 'kanban';

  qControl = new FormControl<string>('', { nonNullable: true });
  filtreSens = new FormControl<SensBon | ''>('', { nonNullable: true });

  afficherModalRefus = false;
  bonEnCours: BonWorkflow | null = null;
  commentaireRefus = new FormControl<string>('', { nonNullable: true, validators: [Validators.required] });

  readonly LIBELLES_STATUT_BON = LIBELLES_STATUT_BON;
  readonly COULEURS_STATUT_BON = COULEURS_STATUT_BON;
  readonly DEVISE = DEVISE;

  private destroy$ = new Subject<void>();

  constructor(
    private service: StockV2WorkflowService,
    private ws: WebsocketService,
    private router: Router,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.qControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.charger());

    this.ws.onStockValidations()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        this.toastr.info(notif.message, notif.titre);
        this.charger();
      });

    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  charger(): void {
    this.loading = true;
    this.service.listerBons({
      q: this.qControl.value?.trim() || undefined,
      sens: this.filtreSens.value || undefined,
    })
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: bons => {
          this.bons = bons ?? [];
          this.construireColonnes();
          this.cdr.markForCheck();
        },
        error: () => this.toastr.error('Impossible de charger le workflow.'),
      });
  }

  private construireColonnes(): void {
    this.colonnes = ORDRE_STATUTS_BON.map(statut => ({
      statut,
      libelle: LIBELLES_STATUT_BON[statut],
      couleur: COULEURS_STATUT_BON[statut],
      bons: this.bons.filter(b => b.statut === statut),
    }));
  }

  basculerVue(v: Vue): void { this.vue = v; }

  ouvrirFiche(b: BonWorkflow): void {
    const base = b.sens === 'ENTREE'
      ? '/admin/stock-v2/controle-mouvements/bons-entree'
      : '/admin/stock-v2/controle-mouvements/bons-sortie';
    this.router.navigate([base, b.id]);
  }

  valider(b: BonWorkflow, event?: Event): void {
    event?.stopPropagation();
    this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        message: `Valider le bon « ${b.reference} » ? Cette action génère les mouvements de stock et est irréversible.`,
        confirmLabel: 'Valider',
        confirmColor: 'primary',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.executer(this.service.valider(b.sens, b.id), 'Bon validé — mouvements générés.');
    });
  }

  ouvrirRefus(b: BonWorkflow, event?: Event): void {
    event?.stopPropagation();
    this.bonEnCours = b;
    this.commentaireRefus.reset('');
    this.afficherModalRefus = true;
    this.cdr.markForCheck();
  }

  fermerRefus(): void {
    this.afficherModalRefus = false;
    this.bonEnCours = null;
    this.cdr.markForCheck();
  }

  confirmerRefus(): void {
    if (!this.bonEnCours) return;
    if (this.commentaireRefus.invalid) {
      this.commentaireRefus.markAsTouched();
      this.toastr.warning('Le motif de refus est obligatoire.');
      return;
    }
    const b = this.bonEnCours;
    this.afficherModalRefus = false;
    this.bonEnCours = null;
    this.executer(
      this.service.refuser(b.sens, b.id, { commentaire: this.commentaireRefus.value.trim() }),
      'Bon refusé.',
    );
  }

  private executer(obs: Observable<unknown>, msg: string): void {
    this.action = true;
    obs.pipe(finalize(() => { this.action = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toastr.success(msg); this.charger(); },
        error: err => {
          if (err?.status === 422) this.toastr.error('Stock insuffisant pour générer les mouvements.');
          else this.toastr.error("L'action a échoué.");
        },
      });
  }

  reinitialiser(): void {
    this.qControl.setValue('', { emitEvent: false });
    this.filtreSens.setValue('', { emitEvent: false });
    this.charger();
  }

  trackByStatut(_: number, c: ColonneKanban): string { return c.statut; }
  trackById(_: number, b: BonWorkflow): string { return b.id; }
}
