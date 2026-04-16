import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';

import { GrilleSalarialeService } from '../../../../../services/grille-salariale.service';
import { CategorieProfessionnelle } from '../../../../../models/grille-salariale.model';

@Component({
  selector: 'app-formulaire-categorie',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './formulaire-categorie.component.html',
  styleUrl: './formulaire-categorie.component.scss',
})
export class FormulaireCategorieComponent implements OnInit, OnDestroy {

  form: FormGroup;
  editingId: string | null = null;
  loading = false;
  saving = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private grilleService: GrilleSalarialeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
  ) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(30)]],
      libelle: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      salaireBase: [0, [Validators.required, Validators.min(0)]],
      regimeIpres: ['REGIME_GENERAL', Validators.required],
      tauxAtMp: [null],
      actif: [true],
      primes: this.fb.array([]),
      indemnites: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId = id;
      this.charger(id);
    }
  }

  get primes(): FormArray { return this.form.get('primes') as FormArray; }
  get indemnites(): FormArray { return this.form.get('indemnites') as FormArray; }

  ajouterPrime(): void {
    this.primes.push(this.fb.group({
      libelle: ['', Validators.required],
      montant: [0, [Validators.required, Validators.min(0)]],
      imposable: [true],
      soumiseIpres: [true],
      soumiseCss: [true],
    }));
  }

  retirerPrime(i: number): void {
    this.primes.removeAt(i);
  }

  ajouterIndemnite(): void {
    this.indemnites.push(this.fb.group({
      libelle: ['', Validators.required],
      montant: [0, [Validators.required, Validators.min(0)]],
      imposable: [false],
    }));
  }

  retirerIndemnite(i: number): void {
    this.indemnites.removeAt(i);
  }

  private charger(id: string): void {
    this.loading = true;
    this.grilleService.getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: cat => {
          this.primes.clear();
          this.indemnites.clear();
          (cat.primes ?? []).forEach(p => this.primes.push(this.fb.group({
            libelle: [p.libelle, Validators.required],
            montant: [p.montant, [Validators.required, Validators.min(0)]],
            imposable: [p.imposable],
            soumiseIpres: [p.soumiseIpres],
            soumiseCss: [p.soumiseCss],
          })));
          (cat.indemnites ?? []).forEach(i => this.indemnites.push(this.fb.group({
            libelle: [i.libelle, Validators.required],
            montant: [i.montant, [Validators.required, Validators.min(0)]],
            imposable: [i.imposable],
          })));
          this.form.patchValue({
            code: cat.code,
            libelle: cat.libelle,
            description: cat.description ?? '',
            salaireBase: cat.salaireBase,
            regimeIpres: cat.regimeIpres,
            tauxAtMp: cat.tauxAtMp ?? null,
            actif: cat.actif,
          });
          this.loading = false;
        },
        error: () => {
          this.toastr.error('Catégorie introuvable.');
          this.loading = false;
          this.router.navigate(['/admin/rh/paie/grille-salariale']);
        },
      });
  }

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez corriger les champs en erreur.');
      return;
    }
    const payload = this.form.value as CategorieProfessionnelle;
    this.saving = true;
    const obs = this.editingId
      ? this.grilleService.modifier(this.editingId, payload)
      : this.grilleService.creer(payload);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastr.success(this.editingId ? 'Catégorie mise à jour.' : 'Catégorie créée.');
        this.saving = false;
        this.router.navigate(['/admin/rh/paie/grille-salariale']);
      },
      error: () => {
        this.toastr.error('Enregistrement impossible.');
        this.saving = false;
      },
    });
  }

  annuler(): void {
    this.router.navigate(['/admin/rh/paie/grille-salariale']);
  }

  champInvalide(nom: string): boolean {
    const c = this.form.get(nom);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
