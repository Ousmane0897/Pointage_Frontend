import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of, catchError, takeUntil, forkJoin } from 'rxjs';

import { SanctionService } from '../../../../../services/sanction.service';
import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import {
  Sanction,
  TypeSanction,
  StatutSanction,
  LIBELLES_TYPE_SANCTION,
  LIBELLES_STATUT_SANCTION,
} from '../../../../../models/sanction.model';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';

@Component({
  selector: 'app-historique-disciplinaire',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './historique-disciplinaire.component.html',
  styleUrl: './historique-disciplinaire.component.scss',
})
export class HistoriqueDisciplinaireComponent implements OnInit, OnDestroy {

  employe: DossierEmploye | null = null;
  sanctions: Sanction[] = [];
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private sanctionService: SanctionService,
    private dossierService: DossierEmployeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    const employeId = this.route.snapshot.paramMap.get('employeId');
    if (employeId) this.loadData(employeId);
  }

  private loadData(employeId: string): void {
    this.loading = true;
    forkJoin({
      employe: this.dossierService.getEmployeById(employeId).pipe(
        catchError(() => of(null)),
      ),
      sanctions: this.sanctionService.getHistoriqueEmploye(employeId).pipe(
        catchError(() => of([] as Sanction[])),
      ),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(res => {
      this.loading = false;
      this.employe = res.employe;
      this.sanctions = res.sanctions;
    });
  }

  voirDetail(id: string): void {
    this.router.navigate(['/admin/rh/developpement-rh/sanctions', id]);
  }

  retour(): void {
    this.router.navigate(['/admin/rh/developpement-rh/sanctions']);
  }

  getTypeLabel(t: TypeSanction): string { return LIBELLES_TYPE_SANCTION[t] ?? t; }

  getTypeClasses(t: TypeSanction): string {
    const map: Record<TypeSanction, string> = {
      AVERTISSEMENT: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      BLAME: 'bg-orange-100 text-orange-700 border border-orange-200',
      MISE_A_PIED: 'bg-red-100 text-red-700 border border-red-200',
      LICENCIEMENT: 'bg-red-200 text-red-800 border border-red-300',
    };
    return map[t];
  }

  getStatutLabel(s: StatutSanction): string { return LIBELLES_STATUT_SANCTION[s] ?? s; }

  get totalParType(): { type: string; count: number }[] {
    const counts: Record<string, number> = {};
    for (const s of this.sanctions) {
      const label = this.getTypeLabel(s.type);
      counts[label] = (counts[label] || 0) + 1;
    }
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
