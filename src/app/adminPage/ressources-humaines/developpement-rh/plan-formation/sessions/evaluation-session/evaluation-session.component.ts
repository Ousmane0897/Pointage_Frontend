import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, forkJoin, catchError, takeUntil } from 'rxjs';

import { FormationService } from '../../../../../../services/formation.service';
import { ParticipationFormation, EvaluationFormation } from '../../../../../../models/formation.model';

@Component({
  selector: 'app-evaluation-session',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './evaluation-session.component.html',
  styleUrl: './evaluation-session.component.scss',
})
export class EvaluationSessionComponent implements OnInit, OnDestroy {

  sessionId!: string;
  participants: ParticipationFormation[] = [];
  evaluations: EvaluationFormation[] = [];
  participantsSansEvaluation: ParticipationFormation[] = [];
  loading = false;

  // Formulaire inline par participant
  notesPending: Record<string, number> = {};
  commentairesPending: Record<string, string> = {};
  savingId: string | null = null;

  notes = [1, 2, 3, 4, 5];

  private destroy$ = new Subject<void>();

  constructor(
    private formationService: FormationService,
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
      participants: this.formationService.getParticipants(this.sessionId).pipe(catchError(() => of([]))),
      evaluations: this.formationService.getEvaluationsSession(this.sessionId).pipe(catchError(() => of([]))),
    }).pipe(takeUntil(this.destroy$)).subscribe(({ participants, evaluations }) => {
      this.loading = false;
      this.participants = (participants as ParticipationFormation[]).filter(p => p.completee);
      this.evaluations = evaluations as EvaluationFormation[];
      const evaluatedIds = new Set(this.evaluations.map(e => e.participationId));
      this.participantsSansEvaluation = this.participants.filter(p => !evaluatedIds.has(p.id!));
      // Init pending notes
      this.participantsSansEvaluation.forEach(p => {
        this.notesPending[p.id!] = 3;
        this.commentairesPending[p.id!] = '';
      });
    });
  }

  setNote(participationId: string, note: number): void {
    this.notesPending[participationId] = note;
  }

  soumettre(p: ParticipationFormation): void {
    const note = this.notesPending[p.id!];
    const commentaire = this.commentairesPending[p.id!]?.trim();
    if (!note || !commentaire) {
      this.toastr.warning('Veuillez renseigner la note et le commentaire.', 'Champs manquants');
      return;
    }
    this.savingId = p.id!;
    const evaluation: EvaluationFormation = {
      participationId: p.id!,
      sessionId: this.sessionId,
      employeId: p.employeId,
      note,
      commentaire,
      dateEvaluation: new Date().toISOString().split('T')[0],
    };
    this.formationService.evaluerFormation(evaluation).pipe(
      catchError(() => { this.toastr.error('Erreur lors de l\'enregistrement.', 'Erreur'); return of(null); }),
      takeUntil(this.destroy$),
    ).subscribe(r => {
      this.savingId = null;
      if (!r) return;
      this.toastr.success('Evaluation enregistrée.', 'Succès');
      this.loadData();
    });
  }

  getParticipantNom(eval_: EvaluationFormation): string {
    const p = this.participants.find(x => x.id === eval_.participationId);
    return p ? `${p.nom} ${p.prenom}` : 'Inconnu';
  }

  retour(): void { this.router.navigate(['/admin/rh/developpement-rh/formations/sessions']); }

  trackByParticipationId(_: number, p: ParticipationFormation): string { return p.id ?? p.employeId; }
  trackByEvalId(_: number, e: EvaluationFormation): string { return e.id ?? e.participationId; }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
