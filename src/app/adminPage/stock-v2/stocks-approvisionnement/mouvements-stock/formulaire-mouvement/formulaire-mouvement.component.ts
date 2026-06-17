import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2MouvementService } from '../../../../../services/stock-v2-mouvement.service';
import {
  MouvementPayload,
  TypeMouvement,
  MotifMouvement,
} from '../../../../../models/stock-v2-mouvement.model';
import { Produit } from '../../../../../models/stock-v2-produit.model';
import { SelecteurProduitComponent } from '../../shared/selecteur-produit/selecteur-produit.component';
import { SelecteurSiteComponent } from '../../shared/selecteur-site/selecteur-site.component';
import {
  LIBELLES_TYPE_MOUVEMENT,
  LIBELLES_MOTIF_MOUVEMENT,
  MOTIFS_PAR_TYPE,
  LIBELLES_UNITE,
} from '../../../../../constants/stock.constants';

@Component({
  selector: 'app-formulaire-mouvement',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    SelecteurProduitComponent,
    SelecteurSiteComponent,
  ],
  templateUrl: './formulaire-mouvement.component.html',
  styleUrl: './formulaire-mouvement.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaireMouvementComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  submitting = false;
  produitCourant: Produit | null = null;

  readonly LIBELLES_TYPE_MOUVEMENT = LIBELLES_TYPE_MOUVEMENT;
  readonly LIBELLES_MOTIF_MOUVEMENT = LIBELLES_MOTIF_MOUVEMENT;
  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly TYPES: TypeMouvement[] = ['ENTREE', 'SORTIE', 'TRANSFERT'];
  motifsDisponibles: MotifMouvement[] = MOTIFS_PAR_TYPE['ENTREE'];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private mouvementService: StockV2MouvementService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      produitId: ['', Validators.required],
      type: ['ENTREE' as TypeMouvement, Validators.required],
      motif: ['ACHAT' as MotifMouvement, Validators.required],
      quantite: [null as number | null, [Validators.required, Validators.min(0.0001)]],
      siteSourceId: [''],
      siteDestinationId: [''],
      date: [this.aujourdhui(), Validators.required],
      commentaire: [''],
    });

    this.appliquerContraintesType('ENTREE');

    this.form.get('type')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((t: TypeMouvement) => this.appliquerContraintesType(t));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Met à jour motifs proposés + validateurs des sites selon le type. */
  private appliquerContraintesType(type: TypeMouvement): void {
    this.motifsDisponibles = MOTIFS_PAR_TYPE[type];
    const motifCtrl = this.form.get('motif')!;
    if (!this.motifsDisponibles.includes(motifCtrl.value)) {
      motifCtrl.setValue(this.motifsDisponibles[0], { emitEvent: false });
    }

    const source = this.form.get('siteSourceId')!;
    const destination = this.form.get('siteDestinationId')!;

    source.clearValidators();
    destination.clearValidators();

    if (type === 'ENTREE') {
      destination.setValidators(Validators.required);
      source.setValue('', { emitEvent: false });
    } else if (type === 'SORTIE') {
      source.setValidators(Validators.required);
      destination.setValue('', { emitEvent: false });
    } else { // TRANSFERT
      source.setValidators(Validators.required);
      destination.setValidators(Validators.required);
    }
    source.updateValueAndValidity({ emitEvent: false });
    destination.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
  }

  onProduitSelectionne(p: Produit): void {
    this.produitCourant = p;
    this.cdr.markForCheck();
  }

  get type(): TypeMouvement { return this.form.get('type')!.value; }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez compléter les champs obligatoires.');
      return;
    }
    const v = this.form.value;
    if (v.type === 'TRANSFERT' && v.siteSourceId === v.siteDestinationId) {
      this.toastr.warning('Les sites source et destination doivent être différents.');
      return;
    }

    const payload: MouvementPayload = {
      produitId: v.produitId,
      type: v.type,
      motif: v.motif,
      quantite: v.quantite,
      siteSourceId: v.type === 'ENTREE' ? undefined : (v.siteSourceId || undefined),
      siteDestinationId: v.type === 'SORTIE' ? undefined : (v.siteDestinationId || undefined),
      date: v.date,
      commentaire: v.commentaire || undefined,
    };

    this.submitting = true;
    this.mouvementService.enregistrer(payload)
      .pipe(finalize(() => { this.submitting = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Mouvement enregistré.');
          this.router.navigate(['/admin/stock-v2/stocks-approvisionnement/mouvements']);
        },
        error: err => {
          if (err?.status === 422) this.toastr.error('Stock insuffisant pour cette sortie/ce transfert.');
          else this.toastr.error("Erreur lors de l'enregistrement du mouvement.");
        },
      });
  }

  get f() { return this.form.controls as { [key: string]: any }; }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
