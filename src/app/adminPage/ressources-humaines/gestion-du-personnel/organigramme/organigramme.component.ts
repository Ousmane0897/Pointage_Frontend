import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

import { OrganigrammeService } from '../../../../services/organigramme.service';
import { NoeudOrganigramme, Departement } from '../../../../models/organigramme.model';

export type VueMode = 'arbre' | 'departements';

@Component({
  selector: 'app-organigramme',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './organigramme.component.html',
  styleUrl: './organigramme.component.scss',
})
export class OrganigrammeComponent implements OnInit, OnDestroy {

  // ─── Données ──────────────────────────────────────────────────────────────
  arbre: NoeudOrganigramme[] = [];
  departements: Departement[] = [];

  // ─── États UI ─────────────────────────────────────────────────────────────
  departementSelectionne: string | null = null;
  noeudSelectionne: NoeudOrganigramme | null = null;
  noeudsExpanded = new Set<string>();
  loading = false;
  vueMode: VueMode = 'arbre';

  // ─── Cycle de vie ─────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private organigrammeService: OrganigrammeService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.chargerDonnees();
  }

  // ─── Chargement des données ───────────────────────────────────────────────
  private chargerDonnees(): void {
    this.loading = true;

    forkJoin({
      departements: this.organigrammeService.getDepartements().pipe(
        catchError(err => {
          this.handleError(err, 'départements');
          return of([] as Departement[]);
        }),
      ),
      arbre: this.organigrammeService.getArbreComplet().pipe(
        catchError(err => {
          this.handleError(err, 'organigramme');
          return of([] as NoeudOrganigramme[]);
        }),
      ),
    })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(({ departements, arbre }) => {
        this.departements = departements;
        this.arbre = arbre;
        // Expand the root nodes by default
        arbre.forEach(noeud => this.noeudsExpanded.add(noeud.id));
      });
  }

  // ─── Gestion des noeuds ───────────────────────────────────────────────────
  toggleNoeud(id: string): void {
    if (this.noeudsExpanded.has(id)) {
      this.noeudsExpanded.delete(id);
    } else {
      this.noeudsExpanded.add(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.noeudsExpanded.has(id);
  }

  // ─── Sélection de noeud ───────────────────────────────────────────────────
  selectionnerNoeud(noeud: NoeudOrganigramme): void {
    this.noeudSelectionne = this.noeudSelectionne?.id === noeud.id ? null : noeud;
  }

  isNoeudSelectionne(noeud: NoeudOrganigramme): boolean {
    return this.noeudSelectionne?.id === noeud.id;
  }

  // ─── Filtre par département ───────────────────────────────────────────────
  selectDepartement(departementId: string | null): void {
    if (!departementId || this.departementSelectionne === departementId) {
      this.departementSelectionne = null;
      this.chargerDonnees();
      return;
    }

    this.departementSelectionne = departementId;
    this.loading = true;

    this.organigrammeService.getParDepartement(departementId)
      .pipe(
        catchError(err => {
          this.handleError(err, 'département');
          return of(null);
        }),
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(noeud => {
        if (noeud) {
          this.arbre = [noeud];
          this.noeudsExpanded.add(noeud.id);
        }
      });
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  navigateToFiche(employeId: string): void {
    this.router.navigate(['/admin/rh/gestion-du-personnel/dossier-employe/fiche', employeId]);
  }

  // ─── Expansion globale ────────────────────────────────────────────────────
  expandAll(): void {
    this.collecterTousLesIds(this.arbre).forEach(id => this.noeudsExpanded.add(id));
  }

  collapseAll(): void {
    this.noeudsExpanded.clear();
  }

  private collecterTousLesIds(noeuds: NoeudOrganigramme[]): string[] {
    const ids: string[] = [];
    for (const noeud of noeuds) {
      ids.push(noeud.id);
      if (noeud.enfants?.length) {
        ids.push(...this.collecterTousLesIds(noeud.enfants));
      }
    }
    return ids;
  }

  // ─── Vue mode ─────────────────────────────────────────────────────────────
  setVueMode(mode: VueMode): void {
    this.vueMode = mode;
    this.departementSelectionne = null;
  }

  // ─── Utilitaires ──────────────────────────────────────────────────────────
  getInitiales(noeud: NoeudOrganigramme): string {
    const p = noeud.prenom?.charAt(0) ?? '';
    const n = noeud.nom?.charAt(0) ?? '';
    return (p + n).toUpperCase();
  }

  getNomDepartement(departementId: string): string {
    return this.departements.find(d => d.id === departementId)?.nom ?? departementId;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  trackByNom(_: number, item: Departement): string {
    return item.nom;
  }

  // ─── Gestion des erreurs ──────────────────────────────────────────────────
  private handleError(err: any, contexte: string): void {
    console.error(`Erreur chargement ${contexte} :`, err);
    if (err.status === 0) {
      this.toastr.error('Impossible de contacter le serveur. Vérifiez votre connexion.', 'Erreur réseau');
    } else if (err.status === 401) {
      this.toastr.warning('Session expirée. Veuillez vous reconnecter.', 'Non autorisé');
    } else if (err.status === 403) {
      this.toastr.error("Accès refusé. Vous n'avez pas les droits nécessaires.", 'Accès refusé');
    } else if (err.status === 404) {
      this.toastr.warning(`Données ${contexte} introuvables.`, 'Introuvable');
    } else {
      this.toastr.error(`Erreur lors du chargement des ${contexte}.`, 'Erreur');
    }
  }

  // ─── Nettoyage ────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
