import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, forkJoin, catchError, takeUntil } from 'rxjs';

import { FormationService } from '../../../../../../services/formation.service';
import { DossierEmployeService } from '../../../../../../services/dossier-employe.service';
import { SessionFormation, ParticipationFormation } from '../../../../../../models/formation.model';
import { DossierEmploye } from '../../../../../../models/dossier-employe.model';
import { PageResponse } from '../../../../../../models/pageResponse.model';

@Component({
  selector: 'app-suivi-participants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './suivi-participants.component.html',
  styleUrl: './suivi-participants.component.scss',
})
export class SuiviParticipantsComponent implements OnInit, OnDestroy {

  sessionId!: string;
  session: SessionFormation | null = null;
  participants: ParticipationFormation[] = [];
  employes: DossierEmploye[] = [];
  selectedEmployeIds: string[] = [];
  loading = false;
  inscriptionEnCours = false;

  private destroy$ = new Subject<void>();

  constructor(
    private formationService: FormationService,
    private dossierEmployeService: DossierEmployeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('id')!;
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    forkJoin({
      session: this.formationService.getSessionById(this.sessionId).pipe(catchError(() => of(null))),
      participants: this.formationService.getParticipants(this.sessionId).pipe(catchError(() => of([]))),
      employes: this.dossierEmployeService.getEmployes(0, 500).pipe(catchError(() => of({ content: [], totalElements: 0 } as PageResponse<DossierEmploye>))),
    }).pipe(takeUntil(this.destroy$)).subscribe(({ session, participants, employes }) => {
      this.loading = false;
      this.session = session;
      this.participants = participants as ParticipationFormation[];
      const inscritsIds = new Set(this.participants.map(p => p.employeId));
      this.employes = (employes as PageResponse<DossierEmploye>).content.filter(e => !inscritsIds.has(e.id!));
    });
  }

  togglePresence(p: ParticipationFormation): void {
    this.formationService.marquerPresence(p.id!, !p.present).pipe(
      catchError(() => { this.toastr.error('Erreur lors de la mise à jour.', 'Erreur'); return of(null); }),
      takeUntil(this.destroy$),
    ).subscribe(r => {
      if (r) { p.present = r.present; this.toastr.success('Présence mise à jour.', 'Succès'); }
    });
  }

  toggleCompletion(p: ParticipationFormation): void {
    if (p.completee) return;
    this.formationService.marquerCompletion(p.id!).pipe(
      catchError(() => { this.toastr.error('Erreur lors de la mise à jour.', 'Erreur'); return of(null); }),
      takeUntil(this.destroy$),
    ).subscribe(r => {
      if (r) { p.completee = r.completee; p.attestationGeneree = r.attestationGeneree; this.toastr.success('Complétion enregistrée.', 'Succès'); }
    });
  }

  toggleEmployeSelection(employeId: string): void {
    const idx = this.selectedEmployeIds.indexOf(employeId);
    if (idx >= 0) this.selectedEmployeIds.splice(idx, 1);
    else this.selectedEmployeIds.push(employeId);
  }

  isEmployeSelected(employeId: string): boolean {
    return this.selectedEmployeIds.includes(employeId);
  }

  inscrireParticipants(): void {
    if (this.selectedEmployeIds.length === 0) return;
    this.inscriptionEnCours = true;
    this.formationService.inscrireParticipants(this.sessionId, this.selectedEmployeIds).pipe(
      catchError(() => { this.toastr.error('Erreur lors de l\'inscription.', 'Erreur'); return of(null); }),
      takeUntil(this.destroy$),
    ).subscribe(r => {
      this.inscriptionEnCours = false;
      if (!r) return;
      this.toastr.success(`${r.length} participant(s) inscrit(s).`, 'Succès');
      this.selectedEmployeIds = [];
      this.loadData();
    });
  }

  retour(): void { this.router.navigate(['/admin/rh/developpement-rh/formations/sessions']); }

  trackById(_: number, p: ParticipationFormation): string { return p.id ?? p.employeId; }
  trackByEmployeId(_: number, e: DossierEmploye): string { return e.id!; }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
