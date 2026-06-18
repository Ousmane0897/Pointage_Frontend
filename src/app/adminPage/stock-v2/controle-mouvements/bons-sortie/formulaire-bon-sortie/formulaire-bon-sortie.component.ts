import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2BonSortieService } from '../../../../../services/stock-v2-bon-sortie.service';
import {
  BonSortie,
  BonSortiePayload,
  DestinatairePayload,
  TypeDestinataire,
  TypeSortie,
} from '../../../../../models/stock-v2-bon-sortie.model';
import { SelecteurSiteComponent } from '../../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import { SelecteurEmployeComponent } from '../../shared/selecteur-employe/selecteur-employe.component';
import {
  EditeurLignesBonComponent,
  creerLigneBon,
} from '../../shared/editeur-lignes-bon/editeur-lignes-bon.component';
import {
  LIBELLES_TYPE_SORTIE,
  ORDRE_TYPES_SORTIE,
  LIBELLES_TYPE_DESTINATAIRE,
  ORDRE_TYPES_DESTINATAIRE,
} from '../../../../../constants/stock.constants';

/**
 * Formulaire de bon de sortie — Module Stock v2 / 7.4 (fonctionnalité 3).
 *
 * Création / édition d'un brouillon. Le destinataire peut être un site (lecture
 * seule TerrainSiteClient), un agent (lecture seule DossierEmploye) ou un
 * client externe (texte libre).
 */
@Component({
  selector: 'app-formulaire-bon-sortie',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    SelecteurSiteComponent,
    SelecteurEmployeComponent,
    EditeurLignesBonComponent,
  ],
  templateUrl: './formulaire-bon-sortie.component.html',
  styleUrl: './formulaire-bon-sortie.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaireBonSortieComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  submitting = false;
  chargement = false;
  idEdition: string | null = null;

  readonly LIBELLES_TYPE_SORTIE = LIBELLES_TYPE_SORTIE;
  readonly TYPES = ORDRE_TYPES_SORTIE;
  readonly LIBELLES_TYPE_DESTINATAIRE = LIBELLES_TYPE_DESTINATAIRE;
  readonly TYPES_DESTINATAIRE = ORDRE_TYPES_DESTINATAIRE;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private service: StockV2BonSortieService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      type: ['DISTRIBUTION_AGENCE_SITE_CLIENT' as TypeSortie, Validators.required],
      date: [this.aujourdhui(), Validators.required],
      siteSourceId: ['', Validators.required],
      destType: ['SITE' as TypeDestinataire, Validators.required],
      destSiteId: [''],
      destAgentId: [''],
      destClientNom: [''],
      motif: [''],
      demandeurId: [''],
      commentaire: [''],
      lignes: this.fb.array([]),
    });

    this.appliquerDestinataire('SITE');
    this.form.get('destType')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((t: TypeDestinataire) => this.appliquerDestinataire(t));

    this.idEdition = this.route.snapshot.paramMap.get('id');
    if (this.idEdition) {
      this.chargerBon(this.idEdition);
    } else {
      this.lignes.push(creerLigneBon());
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get lignes(): FormArray { return this.form.get('lignes') as FormArray; }
  get destType(): TypeDestinataire { return this.form.get('destType')!.value; }

  /** Active le validateur requis selon le type de destinataire choisi. */
  private appliquerDestinataire(type: TypeDestinataire): void {
    const site = this.form.get('destSiteId')!;
    const agent = this.form.get('destAgentId')!;
    const client = this.form.get('destClientNom')!;
    site.clearValidators(); agent.clearValidators(); client.clearValidators();
    if (type === 'SITE') { site.setValidators(Validators.required); agent.setValue('', { emitEvent: false }); client.setValue('', { emitEvent: false }); }
    else if (type === 'AGENT') { agent.setValidators(Validators.required); site.setValue('', { emitEvent: false }); client.setValue('', { emitEvent: false }); }
    else { client.setValidators(Validators.required); site.setValue('', { emitEvent: false }); agent.setValue('', { emitEvent: false }); }
    site.updateValueAndValidity({ emitEvent: false });
    agent.updateValueAndValidity({ emitEvent: false });
    client.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
  }

  private chargerBon(id: string): void {
    this.chargement = true;
    this.service.getById(id)
      .pipe(finalize(() => { this.chargement = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: bon => {
          if (bon.statut !== 'BROUILLON') {
            this.toastr.warning('Seuls les brouillons sont modifiables.');
            this.router.navigate(['/admin/stock-v2/controle-mouvements/bons-sortie', id]);
            return;
          }
          this.remplir(bon);
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastr.error('Bon introuvable.');
          this.router.navigate(['/admin/stock-v2/controle-mouvements/bons-sortie']);
        },
      });
  }

  private remplir(bon: BonSortie): void {
    const d = bon.destinataire;
    this.form.patchValue({
      type: bon.type,
      date: (bon.date ?? '').substring(0, 10),
      siteSourceId: bon.siteSourceId,
      destType: d?.type ?? 'SITE',
      destSiteId: d?.siteId ?? '',
      destAgentId: d?.agentId ?? '',
      destClientNom: d?.clientNom ?? '',
      motif: bon.motif ?? '',
      demandeurId: bon.demandeurId ?? '',
      commentaire: bon.commentaire ?? '',
    });
    this.appliquerDestinataire(d?.type ?? 'SITE');
    this.lignes.clear();
    (bon.lignes ?? []).forEach(l => this.lignes.push(creerLigneBon({
      produitId: l.produitId,
      produitCode: l.produitCode,
      produitLibelle: l.produitLibelle,
      unite: l.unite,
      prixUnitaire: l.prixUnitaire ?? null,
      quantite: l.quantite,
    })));
    if (this.lignes.length === 0) this.lignes.push(creerLigneBon());
  }

  enregistrer(): void {
    if (this.form.invalid || this.lignes.length === 0) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez compléter les champs obligatoires et ajouter au moins une ligne.');
      return;
    }
    const v = this.form.getRawValue();
    const destinataire: DestinatairePayload = { type: v.destType };
    if (v.destType === 'SITE') destinataire.siteId = v.destSiteId;
    else if (v.destType === 'AGENT') destinataire.agentId = v.destAgentId;
    else destinataire.clientNom = v.destClientNom;

    const payload: BonSortiePayload = {
      type: v.type,
      date: v.date,
      siteSourceId: v.siteSourceId,
      destinataire,
      motif: v.motif || undefined,
      demandeurId: v.demandeurId || undefined,
      commentaire: v.commentaire || undefined,
      lignes: (v.lignes as { produitId: string; quantite: number }[])
        .map(l => ({ produitId: l.produitId, quantite: l.quantite })),
    };

    this.submitting = true;
    const obs = this.idEdition
      ? this.service.modifier(this.idEdition, payload)
      : this.service.creer(payload);

    obs.pipe(finalize(() => { this.submitting = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: bon => {
          this.toastr.success(this.idEdition ? 'Bon mis à jour.' : 'Bon créé (brouillon).');
          this.router.navigate(['/admin/stock-v2/controle-mouvements/bons-sortie', bon.id]);
        },
        error: () => this.toastr.error("Erreur lors de l'enregistrement du bon."),
      });
  }

  annuler(): void {
    this.router.navigate(['/admin/stock-v2/controle-mouvements/bons-sortie']);
  }

  get f() { return this.form.controls as { [key: string]: any }; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
