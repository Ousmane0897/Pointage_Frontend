import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2InventaireService } from '../../../../../services/stock-v2-inventaire.service';
import { StockV2PdfService } from '../../../../../services/stock-v2-pdf.service';
import { LoginService } from '../../../../../services/login.service';
import { ROLE_SUPERADMIN } from '../../../../../constants/roles.constants';
import {
  SuppressionDefinitiveDialogComponent,
  SuppressionDefinitiveDialogResult,
} from '../../../shared/dialogs/suppression-definitive-dialog.component';
import { Inventaire, StatutInventaire } from '../../../../../models/stock-v2-inventaire.model';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';
import {
  LIBELLES_STATUT_INVENTAIRE,
  COULEURS_STATUT_INVENTAIRE,
  ORDRE_STATUTS_INVENTAIRE,
  LIBELLES_UNITE,
} from '../../../../../constants/stock.constants';

@Component({
  selector: 'app-saisie-inventaire',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './saisie-inventaire.component.html',
  styleUrl: './saisie-inventaire.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaisieInventaireComponent implements OnInit, OnDestroy {

  inventaire: Inventaire | null = null;
  loading = false;
  action = false;                  // une transition est en cours

  form!: FormGroup;                // { lignes: FormArray }

  readonly LIBELLES_STATUT_INVENTAIRE = LIBELLES_STATUT_INVENTAIRE;
  readonly COULEURS_STATUT_INVENTAIRE = COULEURS_STATUT_INVENTAIRE;
  readonly ETAPES = ORDRE_STATUTS_INVENTAIRE;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;

  /** Suppression d'un inventaire engagé : super-administrateur seul (mémorisé — OnPush). */
  readonly estSuperAdmin: boolean;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private service: StockV2InventaireService,
    private pdfService: StockV2PdfService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    loginService: LoginService,
  ) {
    this.estSuperAdmin = loginService.getUserRole() === ROLE_SUPERADMIN;
  }

  ngOnInit(): void {
    this.form = this.fb.group({ lignes: this.fb.array([]) });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.charger(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get lignes(): FormArray { return this.form.get('lignes') as FormArray; }

  private charger(id: string): void {
    this.loading = true;
    this.service.getById(id)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: inv => { this.inventaire = inv; this.construireForm(inv); this.cdr.markForCheck(); },
        error: () => this.toastr.error('Inventaire introuvable.'),
      });
  }

  private construireForm(inv: Inventaire): void {
    // (Re)construit la structure uniquement si le jeu de lignes a changé ;
    // sinon patche les valeurs des contrôles existants (préserve les directives
    // liées pour que enable()/disable() resynchronise bien le DOM sous OnPush).
    if (this.lignes.length !== inv.lignes.length) {
      this.lignes.clear();
      inv.lignes.forEach(l => {
        this.lignes.push(this.fb.group({
          qtePhysique: [l.qtePhysique ?? null],
          justification: [l.justification ?? ''],
        }));
      });
    } else {
      inv.lignes.forEach((l, i) => {
        this.lignes.at(i).patchValue(
          { qtePhysique: l.qtePhysique ?? null, justification: l.justification ?? '' },
          { emitEvent: false },
        );
      });
    }

    // Activation explicite et idempotente (resynchronise le DOM via les directives).
    if (inv.statut === 'COMPTAGE') {
      this.lignes.enable({ emitEvent: false });
    } else {
      this.lignes.disable({ emitEvent: false });
    }
  }

  // ─── Calculs d'écart ──────────────────────────────────────────────────────

  ecart(i: number): number | null {
    if (!this.inventaire) return null;
    const phys = this.lignes.at(i)?.get('qtePhysique')?.value;
    if (phys === null || phys === undefined || phys === '') return null;
    return Number(phys) - this.inventaire.lignes[i].qteTheorique;
  }

  ecartHorsSeuil(i: number): boolean {
    const e = this.ecart(i);
    if (e === null || !this.inventaire) return false;
    return Math.abs(e) > this.inventaire.seuilEcartJustification;
  }

  justificationManquante(i: number): boolean {
    if (!this.ecartHorsSeuil(i)) return false;
    const j = this.lignes.at(i)?.get('justification')?.value;
    return !j || String(j).trim() === '';
  }

  // ─── Transitions de workflow ──────────────────────────────────────────────

  estEtapeAtteinte(etape: StatutInventaire): boolean {
    if (!this.inventaire) return false;
    return this.ETAPES.indexOf(this.inventaire.statut) >= this.ETAPES.indexOf(etape);
  }

  demarrerComptage(): void {
    if (!this.inventaire?.id) return;
    this.executer(this.service.demarrerComptage(this.inventaire.id), 'Comptage démarré.');
  }

  enregistrerComptage(): void {
    if (!this.inventaire?.id) return;
    const payload = {
      lignes: this.inventaire.lignes.map((l, i) => ({
        produitId: l.produitId,
        qtePhysique: this.lignes.at(i).get('qtePhysique')?.value ?? null,
        justification: this.lignes.at(i).get('justification')?.value || undefined,
      })),
    };
    this.action = true;
    this.service.enregistrerComptage(this.inventaire.id, payload)
      .pipe(finalize(() => { this.action = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: inv => { this.inventaire = inv; this.construireForm(inv); this.toastr.success('Comptage enregistré.'); this.cdr.markForCheck(); },
        error: () => this.toastr.error("Erreur lors de l'enregistrement du comptage."),
      });
  }

  soumettreValidation(): void {
    if (!this.inventaire?.id) return;
    // Vérifie les justifications manquantes avant soumission
    const manquantes = this.inventaire.lignes.some((_, i) => this.justificationManquante(i));
    if (manquantes) {
      this.toastr.warning('Certains écarts hors seuil ne sont pas justifiés.');
      return;
    }
    this.enregistrerPuis(() => this.executer(this.service.soumettreValidation(this.inventaire!.id!), 'Inventaire soumis à validation.'));
  }

  cloturer(): void {
    if (!this.inventaire?.id) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        message: 'Clôturer cet inventaire ?\nLes écarts seront appliqués au stock (mouvements d\'ajustement). Action irréversible.',
        confirmLabel: 'Clôturer',
        confirmColor: 'primary',
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (!ok) return;
      this.executer(this.service.cloturer(this.inventaire!.id!), 'Inventaire clôturé — écarts appliqués au stock.');
    });
  }

  /** Enregistre le comptage courant puis exécute une action. */
  private enregistrerPuis(suite: () => void): void {
    if (!this.inventaire?.id) return;
    const payload = {
      lignes: this.inventaire.lignes.map((l, i) => ({
        produitId: l.produitId,
        qtePhysique: this.lignes.at(i).get('qtePhysique')?.value ?? null,
        justification: this.lignes.at(i).get('justification')?.value || undefined,
      })),
    };
    this.action = true;
    this.service.enregistrerComptage(this.inventaire.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: inv => { this.inventaire = inv; suite(); },
        error: () => { this.action = false; this.toastr.error('Erreur lors de la sauvegarde du comptage.'); this.cdr.markForCheck(); },
      });
  }

  private executer(obs: ReturnType<StockV2InventaireService['cloturer']>, message: string): void {
    this.action = true;
    obs.pipe(finalize(() => { this.action = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: inv => { this.inventaire = inv; this.construireForm(inv); this.toastr.success(message); this.cdr.markForCheck(); },
        error: () => this.toastr.error('Action impossible.'),
      });
  }

  /**
   * Suppression d'un inventaire déjà engagé — SUPERADMIN seul. Le serveur contre-passe les écarts
   * appliqués à la clôture ; on revient à la liste, la fiche n'ayant plus d'objet.
   */
  supprimerDefinitivement(): void {
    const inv = this.inventaire;
    if (!inv?.id || !this.estSuperAdmin) return;
    this.dialog.open<SuppressionDefinitiveDialogComponent, unknown, SuppressionDefinitiveDialogResult | null>(
      SuppressionDefinitiveDialogComponent, {
        width: '480px',
        data: {
          titre: `Supprimer l'inventaire « ${inv.libelle} »`,
          reference: inv.reference,
          effetStock: inv.statut === 'CLOTURE'
            ? 'Les écarts appliqués à la clôture sont contre-passés : le stock revient à sa valeur d’avant inventaire.'
            : 'Cet inventaire n’a pas encore touché le stock : aucune quantité ne sera modifiée.',
        },
      }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(res => {
        if (!res) return;
        this.action = true;
        this.service.supprimerDefinitivement(inv.id!, res.motif)
          .pipe(finalize(() => { this.action = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success('Inventaire supprimé et stock rétabli.');
              this.router.navigate(['/admin/stock-v2/stocks-approvisionnement/inventaires']);
            },
            error: err => {
              if (err?.status === 403) this.toastr.error('Action non autorisée pour votre profil.');
              else this.toastr.error(err?.error?.message ?? 'Suppression impossible.');
            },
          });
      });
  }

  telechargerPv(): void {
    if (this.inventaire) this.pdfService.genererPvInventaire(this.inventaire);
  }
}
