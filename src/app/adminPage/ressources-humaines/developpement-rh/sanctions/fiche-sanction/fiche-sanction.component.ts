import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, takeUntil } from 'rxjs';

import { SanctionService } from '../../../../../services/sanction.service';
import {
  Sanction,
  TypeSanction,
  StatutSanction,
  LIBELLES_TYPE_SANCTION,
  LIBELLES_STATUT_SANCTION,
} from '../../../../../models/sanction.model';

@Component({
  selector: 'app-fiche-sanction',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './fiche-sanction.component.html',
  styleUrl: './fiche-sanction.component.scss',
})
export class FicheSanctionComponent implements OnInit, OnDestroy {

  sanction: Sanction | null = null;
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private sanctionService: SanctionService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadSanction(id);
  }

  private loadSanction(id: string): void {
    this.loading = true;
    this.sanctionService
      .getById(id)
      .pipe(
        catchError(() => {
          this.toastr.error('Impossible de charger la sanction.', 'Erreur');
          this.router.navigate(['/admin/rh/developpement-rh/sanctions']);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(s => {
        this.loading = false;
        this.sanction = s;
      });
  }

  modifier(): void {
    if (!this.sanction?.id) return;
    this.router.navigate(['/admin/rh/developpement-rh/sanctions', this.sanction.id, 'modifier']);
  }

  retour(): void {
    this.router.navigate(['/admin/rh/developpement-rh/sanctions']);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  getTypeLabel(t: TypeSanction): string { return LIBELLES_TYPE_SANCTION[t] ?? t; }

  getTypeClasses(t: TypeSanction): string {
    const map: Record<TypeSanction, string> = {
      AVERTISSEMENT: 'bg-yellow-100 text-yellow-700',
      BLAME: 'bg-orange-100 text-orange-700',
      MISE_A_PIED: 'bg-red-100 text-red-700',
      LICENCIEMENT: 'bg-red-200 text-red-800',
    };
    return map[t];
  }

  getStatutLabel(s: StatutSanction): string { return LIBELLES_STATUT_SANCTION[s] ?? s; }

  /**
   * Étapes de la procédure disciplinaire pour la timeline.
   */
  get etapesProcedure(): { label: string; date: string | undefined; done: boolean }[] {
    if (!this.sanction) return [];
    return [
      { label: 'Convocation', date: this.sanction.dateConvocation, done: !!this.sanction.dateConvocation },
      { label: 'Entretien', date: this.sanction.dateEntretien, done: !!this.sanction.dateEntretien },
      { label: 'Notification', date: this.sanction.dateNotification, done: !!this.sanction.dateNotification },
      { label: 'Exécution', date: this.sanction.statut === 'EXECUTEE' ? this.sanction.dateSanction : undefined, done: this.sanction.statut === 'EXECUTEE' },
    ];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
