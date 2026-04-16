import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, finalize, takeUntil } from 'rxjs';

import { CongeService } from '../../../../../services/conge.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import { DemandeConge, SoldeConge } from '../../../../../models/conge.model';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';
import { PageResponse } from '../../../../../models/pageResponse.model';

@Component({
  selector: 'app-demande-conge',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './demande-conge.component.html',
  styleUrl: './demande-conge.component.scss',
})
export class DemandeCongeComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  employes: DossierEmploye[] = [];
  soldeEmployeSelectionne: SoldeConge | null = null;
  submitting = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private congeService: CongeService,
    private dossierService: DossierEmployeService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      employeId: ['', Validators.required],
      type: ['ANNUEL', Validators.required],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required],
      motif: [''],
    });

    this.dossierService.getEmployes(0, 500).pipe(
      catchError(() => of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>)),
      takeUntil(this.destroy$),
    ).subscribe(res => (this.employes = res.content));

    this.form.get('employeId')!.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(id => this.chargerSolde(id));
  }

  private chargerSolde(employeId: string): void {
    if (!employeId) { this.soldeEmployeSelectionne = null; return; }
    this.congeService.getSoldeEmploye(employeId).pipe(
      catchError(() => of(null)),
      takeUntil(this.destroy$),
    ).subscribe(s => (this.soldeEmployeSelectionne = s));
  }

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Veuillez remplir tous les champs obligatoires.', 'Formulaire incomplet');
      return;
    }

    if (this.form.value.dateFin < this.form.value.dateDebut) {
      this.toastr.warning('La date de fin doit être après la date de début.', 'Dates invalides');
      return;
    }

    const payload: DemandeConge = {
      ...this.form.value,
      statut: 'EN_ATTENTE',
    };

    this.submitting = true;
    this.congeService.creerDemande(payload).pipe(
      catchError(err => { this.handleError(err); return of(null); }),
      finalize(() => (this.submitting = false)),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      if (!res) return;
      this.toastr.success('Demande soumise. En attente d\'approbation.', 'Succès');
      this.router.navigate(['/admin/rh/temps-et-presences/conges']);
    });
  }

  annuler(): void {
    this.router.navigate(['/admin/rh/temps-et-presences/conges']);
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
