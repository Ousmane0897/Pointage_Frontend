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

import { StockV2AnalyseChantierService } from '../../../../../services/stock-v2-analyse-chantier.service';
import { Chantier, ChantierPayload } from '../../../../../models/stock-v2-chantier.model';
import { SelecteurSiteComponent } from '../../../stocks-approvisionnement/shared/selecteur-site/selecteur-site.component';

/**
 * Formulaire de chantier — Module Stock v2 / 7.5 (fonctionnalité 2).
 *
 * Création / édition d'un chantier (référentiel léger). Un chantier CLOTURE
 * n'est plus modifiable (figé).
 */
@Component({
  selector: 'app-formulaire-chantier',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, SelecteurSiteComponent],
  templateUrl: './formulaire-chantier.component.html',
  styleUrl: './formulaire-chantier.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaireChantierComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  submitting = false;
  chargement = false;
  idEdition: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private service: StockV2AnalyseChantierService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      reference: ['', Validators.required],
      nom: ['', Validators.required],
      siteId: [''],
      client: [''],
      description: [''],
      dateDebut: [this.aujourdhui(), Validators.required],
    });

    this.idEdition = this.route.snapshot.paramMap.get('id');
    if (this.idEdition) this.charger(this.idEdition);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() { return this.form.controls as { [key: string]: any }; }

  private charger(id: string): void {
    this.chargement = true;
    this.service.getDetail(id)
      .pipe(finalize(() => { this.chargement = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: d => {
          const c = d.chantier;
          if (c.statut === 'CLOTURE') {
            this.toastr.warning('Un chantier clôturé ne peut pas être modifié.');
            this.router.navigate(['/admin/stock-v2/analyse-consommations/chantiers', id]);
            return;
          }
          this.form.patchValue({
            reference: c.reference,
            nom: c.nom,
            siteId: c.siteId ?? '',
            client: c.client ?? '',
            description: c.description ?? '',
            dateDebut: (c.dateDebut ?? '').substring(0, 10),
          });
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastr.error('Chantier introuvable.');
          this.router.navigate(['/admin/stock-v2/analyse-consommations/chantiers']);
        },
      });
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez compléter les champs obligatoires.');
      return;
    }
    const v = this.form.getRawValue();
    const payload: ChantierPayload = {
      reference: v.reference,
      nom: v.nom,
      siteId: v.siteId || undefined,
      client: v.client || undefined,
      description: v.description || undefined,
      dateDebut: v.dateDebut,
    };

    this.submitting = true;
    const obs = this.idEdition
      ? this.service.modifier(this.idEdition, payload)
      : this.service.creer(payload);

    obs.pipe(finalize(() => { this.submitting = false; this.cdr.markForCheck(); }), takeUntil(this.destroy$))
      .subscribe({
        next: (c: Chantier) => {
          this.toastr.success(this.idEdition ? 'Chantier mis à jour.' : 'Chantier créé.');
          this.router.navigate(['/admin/stock-v2/analyse-consommations/chantiers', c.id]);
        },
        error: () => this.toastr.error("Erreur lors de l'enregistrement du chantier."),
      });
  }

  annuler(): void {
    this.router.navigate(['/admin/stock-v2/analyse-consommations/chantiers']);
  }

  private aujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
