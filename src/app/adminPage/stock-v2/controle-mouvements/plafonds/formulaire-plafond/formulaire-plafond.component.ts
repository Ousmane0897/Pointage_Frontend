import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { StockV2PlafondService } from '../../../../../services/stock-v2-plafond.service';
import { StockV2CategorieService } from '../../../../../services/stock-v2-categorie.service';
import {
  Plafond,
  PlafondPayload,
  GranularitePlafond,
} from '../../../../../models/stock-v2-plafond.model';
import { CategorieStock } from '../../../../../models/stock-v2-categorie.model';
import { SelecteurSiteComponent } from '../../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';
import { SelecteurProduitComponent } from '../../../stocks-approvisionnement/shared/selecteur-produit/selecteur-produit.component';
import { LIBELLES_GRANULARITE_PLAFOND } from '../../../../../constants/stock.constants';

/**
 * Formulaire de plafond de dotation — Module Stock v2 / 7.4 (fonctionnalité 7).
 *
 * Création / édition d'un plafond mensuel par site, ciblant un produit ou une
 * catégorie.
 */
@Component({
  selector: 'app-formulaire-plafond',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    SelecteurSiteComponent,
    SelecteurProduitComponent,
  ],
  templateUrl: './formulaire-plafond.component.html',
  styleUrl: './formulaire-plafond.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulairePlafondComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  submitting = false;
  chargement = false;
  idEdition: string | null = null;
  categories: CategorieStock[] = [];

  readonly LIBELLES_GRANULARITE_PLAFOND = LIBELLES_GRANULARITE_PLAFOND;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private service: StockV2PlafondService,
    private categorieService: StockV2CategorieService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      siteId: ['', Validators.required],
      granularite: ['PRODUIT' as GranularitePlafond, Validators.required],
      cibleProduitId: [''],
      cibleCategorieId: [''],
      plafondMensuel: [null as number | null, [Validators.required, Validators.min(0.0001)]],
      actif: [true],
      commentaire: [''],
    });

    this.categorieService.listerToutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: cats => { this.categories = cats ?? []; this.cdr.markForCheck(); },
      });

    this.appliquerGranularite('PRODUIT');
    this.form.get('granularite')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((g: GranularitePlafond) => this.appliquerGranularite(g));

    this.idEdition = this.route.snapshot.paramMap.get('id');
    if (this.idEdition) this.chargerPlafond(this.idEdition);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get granularite(): GranularitePlafond { return this.form.get('granularite')!.value; }

  private appliquerGranularite(g: GranularitePlafond): void {
    const prod = this.form.get('cibleProduitId')!;
    const cat = this.form.get('cibleCategorieId')!;
    prod.clearValidators(); cat.clearValidators();
    if (g === 'PRODUIT') { prod.setValidators(Validators.required); cat.setValue('', { emitEvent: false }); }
    else { cat.setValidators(Validators.required); prod.setValue('', { emitEvent: false }); }
    prod.updateValueAndValidity({ emitEvent: false });
    cat.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
  }

  private chargerPlafond(id: string): void {
    this.chargement = true;
    this.service.getById(id)
      .pipe(finalize(() => { this.chargement = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: p => { this.remplir(p); this.cdr.markForCheck(); },
        error: () => {
          this.toastr.error('Plafond introuvable.');
          this.router.navigate(['/admin/stock-v2/controle-mouvements/plafonds']);
        },
      });
  }

  private remplir(p: Plafond): void {
    this.form.patchValue({
      siteId: p.siteId,
      granularite: p.granularite,
      cibleProduitId: p.granularite === 'PRODUIT' ? p.cibleId : '',
      cibleCategorieId: p.granularite === 'CATEGORIE' ? p.cibleId : '',
      plafondMensuel: p.plafondMensuel,
      actif: p.actif,
      commentaire: p.commentaire ?? '',
    });
    this.appliquerGranularite(p.granularite);
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez compléter les champs obligatoires.');
      return;
    }
    const v = this.form.getRawValue();
    const cibleId = v.granularite === 'PRODUIT' ? v.cibleProduitId : v.cibleCategorieId;
    const payload: PlafondPayload = {
      siteId: v.siteId,
      granularite: v.granularite,
      cibleId,
      plafondMensuel: v.plafondMensuel,
      actif: v.actif,
      commentaire: v.commentaire || undefined,
    };

    this.submitting = true;
    const obs = this.idEdition
      ? this.service.modifier(this.idEdition, payload)
      : this.service.creer(payload);

    obs.pipe(finalize(() => { this.submitting = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(this.idEdition ? 'Plafond mis à jour.' : 'Plafond créé.');
          this.router.navigate(['/admin/stock-v2/controle-mouvements/plafonds']);
        },
        error: () => this.toastr.error("Erreur lors de l'enregistrement du plafond."),
      });
  }

  annuler(): void {
    this.router.navigate(['/admin/stock-v2/controle-mouvements/plafonds']);
  }

  get f() { return this.form.controls as { [key: string]: any }; }
}
