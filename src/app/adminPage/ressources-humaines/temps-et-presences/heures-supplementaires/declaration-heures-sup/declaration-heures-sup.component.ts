import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { HeureSupplementaireService } from '../../../../../services/heure-supplementaire.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import {
  HeureSupplementaire,
  TypeMajoration,
  TAUX_MAJORATION_HS,
} from '../../../../../models/heure-supplementaire.model';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';
import { PageResponse } from '../../../../../models/pageResponse.model';

@Component({
  selector: 'app-declaration-heures-sup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './declaration-heures-sup.component.html',
  styleUrl: './declaration-heures-sup.component.scss',
})
export class DeclarationHeuresSupComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  employes: DossierEmploye[] = [];
  submitting = false;

  // Calculs temps réel
  nombreHeuresCalcule = 0;
  heuresMajoreesCalculees = 0;
  tauxActuel = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private hsService: HeureSupplementaireService,
    private dossierService: DossierEmployeService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      employeId: ['', Validators.required],
      date: ['', Validators.required],
      heureDebut: ['', Validators.required],
      heureFin: ['', Validators.required],
      typeMajoration: ['T_15' as TypeMajoration, Validators.required],
      motif: [''],
    });

    this.dossierService.getEmployes(0, 500).pipe(
      catchError(() => of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>)),
      takeUntil(this.destroy$),
    ).subscribe(res => (this.employes = res.content));

    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.recalculer());
    this.recalculer();
  }

  private recalculer(): void {
    const v = this.form.value;
    const t = v.typeMajoration as TypeMajoration;
    this.tauxActuel = TAUX_MAJORATION_HS[t] ?? 0;

    if (v.heureDebut && v.heureFin) {
      this.nombreHeuresCalcule = this.hsService.calculerNombreHeures(v.heureDebut, v.heureFin);
      this.heuresMajoreesCalculees = this.hsService.calculerHeuresMajorees(this.nombreHeuresCalcule, t);
    } else {
      this.nombreHeuresCalcule = 0;
      this.heuresMajoreesCalculees = 0;
    }
  }

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez remplir tous les champs obligatoires.', 'Formulaire incomplet');
      return;
    }

    if (this.nombreHeuresCalcule <= 0) {
      this.toastr.warning('Les horaires de début et de fin sont incohérents.', 'Horaires invalides');
      return;
    }

    const v = this.form.value;
    const payload: HeureSupplementaire = {
      employeId: v.employeId,
      date: v.date,
      heureDebut: v.heureDebut,
      heureFin: v.heureFin,
      nombreHeures: this.nombreHeuresCalcule,
      typeMajoration: v.typeMajoration,
      tauxMajoration: this.tauxActuel,
      heuresMajoreesEquivalent: this.heuresMajoreesCalculees,
      motif: v.motif,
      statut: 'EN_ATTENTE',
    };

    this.submitting = true;
    this.hsService.declarer(payload).pipe(
      catchError(err => { this.handleError(err); return of(null); }),
      finalize(() => (this.submitting = false)),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      if (!res) return;
      this.toastr.success('Heures supplémentaires déclarées.', 'Succès');
      this.router.navigate(['/admin/rh/temps-et-presences/heures-supplementaires']);
    });
  }

  annuler(): void {
    this.router.navigate(['/admin/rh/temps-et-presences/heures-supplementaires']);
  }

  private handleError(err: any): void {
    console.error(err);
    if (err?.status === 0) this.toastr.error('Serveur injoignable.', 'Erreur réseau');
    else this.toastr.error('Une erreur est survenue.', 'Erreur');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
