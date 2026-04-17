import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, takeUntil } from 'rxjs';

import { FormationService } from '../../../../../../services/formation.service';
import { DossierEmployeService } from '../../../../../../services/dossier-employe.service';
import { BesoinFormation, Formation } from '../../../../../../models/formation.model';
import { DossierEmploye } from '../../../../../../models/dossier-employe.model';
import { PageResponse } from '../../../../../../models/pageResponse.model';

@Component({
  selector: 'app-formulaire-besoin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './formulaire-besoin.component.html',
  styleUrl: './formulaire-besoin.component.scss',
})
export class FormulaireBesoinComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  isEditMode = false;
  besoinId: string | null = null;
  loading = false;
  saving = false;
  employes: DossierEmploye[] = [];
  formations: Formation[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private formationService: FormationService,
    private dossierEmployeService: DossierEmployeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadEmployes();
    this.loadFormations();
    this.besoinId = this.route.snapshot.paramMap.get('id');
    if (this.besoinId) {
      this.isEditMode = true;
      this.loadBesoin(this.besoinId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      employeId: ['', Validators.required],
      departement: ['', Validators.required],
      competenceLacune: ['', Validators.required],
      priorite: ['MOYENNE', Validators.required],
      formationSuggereId: [''],
      source: ['MANAGER', Validators.required],
      statut: ['IDENTIFIE', Validators.required],
    });

    // Auto-fill département quand l'employé change
    this.form.get('employeId')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(employeId => {
      const emp = this.employes.find(e => e.id === employeId);
      if (emp) {
        this.form.patchValue({ departement: emp.departement });
      }
    });
  }

  private loadEmployes(): void {
    this.dossierEmployeService.getEmployes(0, 500).pipe(
      catchError(() => of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>)),
      takeUntil(this.destroy$),
    ).subscribe(res => (this.employes = res.content));
  }

  private loadFormations(): void {
    this.formationService.lister(0, 200).pipe(
      catchError(() => of({ content: [], totalElements: 0 } as PageResponse<Formation>)),
      takeUntil(this.destroy$),
    ).subscribe(res => (this.formations = res.content));
  }

  private loadBesoin(id: string): void {
    this.loading = true;
    this.formationService.listerBesoins(0, 1, { q: undefined, departement: undefined, priorite: undefined, statut: undefined }).pipe(
      catchError(() => { this.toastr.error('Impossible de charger le besoin.', 'Erreur'); return of(null); }),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      // Load via modifierBesoin needs existing data - use dedicated get or list
    });

    // Use HTTP directly via the service pattern: try loading by iterating
    // Since no getBesoinById exists, we use listerBesoins and find
    this.formationService.listerBesoins(0, 500).pipe(
      catchError(() => {
        this.toastr.error('Impossible de charger le besoin.', 'Erreur');
        this.router.navigate(['/admin/rh/developpement-rh/formations/besoins']);
        return of({ content: [], totalElements: 0 } as PageResponse<BesoinFormation>);
      }),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      this.loading = false;
      const besoin = res.content.find(b => b.id === id);
      if (!besoin) {
        this.toastr.error('Besoin introuvable.', 'Erreur');
        this.router.navigate(['/admin/rh/developpement-rh/formations/besoins']);
        return;
      }
      this.form.patchValue({
        employeId: besoin.employeId,
        departement: besoin.departement,
        competenceLacune: besoin.competenceLacune,
        priorite: besoin.priorite,
        formationSuggereId: besoin.formationSuggereId || '',
        source: besoin.source,
        statut: besoin.statut,
      });
    });
  }

  enregistrer(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const besoin: BesoinFormation = {
      ...this.form.value,
      formationSuggereId: this.form.value.formationSuggereId || undefined,
      dateIdentification: new Date().toISOString().split('T')[0],
    };
    const obs$ = this.isEditMode
      ? this.formationService.modifierBesoin(this.besoinId!, besoin)
      : this.formationService.creerBesoin(besoin);

    obs$.pipe(
      catchError(() => { this.toastr.error('Erreur lors de l\'enregistrement.', 'Erreur'); return of(null); }),
      takeUntil(this.destroy$),
    ).subscribe(r => {
      this.saving = false;
      if (!r) return;
      this.toastr.success(this.isEditMode ? 'Besoin modifié.' : 'Besoin créé.', 'Succès');
      this.router.navigate(['/admin/rh/developpement-rh/formations/besoins']);
    });
  }

  annuler(): void { this.router.navigate(['/admin/rh/developpement-rh/formations/besoins']); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
