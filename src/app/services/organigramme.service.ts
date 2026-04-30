import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { DossierEmployeService } from './dossier-employe.service';
import { DossierEmploye } from '../models/dossier-employe.model';
import { NoeudOrganigramme, Departement } from '../models/organigramme.model';

/**
 * Service pour l'organigramme hiérarchique – Gestion du Personnel.
 *
 * L'arbre et la liste des départements sont reconstruits côté client à partir
 * des dossiers employés (champ `superieurHierarchiqueId`). Aucun endpoint
 * dédié côté backend.
 */
@Injectable({ providedIn: 'root' })
export class OrganigrammeService {

  private employes$?: Observable<DossierEmploye[]>;

  constructor(private dossierEmployeService: DossierEmployeService) {}

  /** Récupère l'arbre hiérarchique complet */
  getArbreComplet(): Observable<NoeudOrganigramme[]> {
    return this.getActifs().pipe(map(actifs => this.construireArbre(actifs)));
  }

  /** Liste tous les départements (effectif + responsable dérivés) */
  getDepartements(): Observable<Departement[]> {
    return this.getActifs().pipe(map(actifs => this.construireDepartements(actifs)));
  }

  /**
   * Récupère l'organigramme d'un département.
   * Retourne un nœud-racine synthétique dont les enfants sont les employés
   * du département sans manager interne au département.
   */
  getParDepartement(departementId: string): Observable<NoeudOrganigramme> {
    return this.getActifs().pipe(
      map(actifs => {
        const employesDept = actifs.filter(e => e.departement === departementId);
        const idsDept = new Set(employesDept.map(e => e.id!));
        const childrenByParent = this.indexerParSuperieur(employesDept);
        const racines = employesDept.filter(
          e => !e.superieurHierarchiqueId || !idsDept.has(e.superieurHierarchiqueId),
        );

        return {
          id: `dept-${departementId}`,
          nom: departementId,
          prenom: '',
          poste: 'Département',
          departement: departementId,
          enfants: racines.map(e => this.toNoeud(e, childrenByParent)),
        };
      }),
    );
  }

  /** Subordonnés directs d'un employé */
  getSubordonnes(employeId: string): Observable<NoeudOrganigramme[]> {
    return this.getActifs().pipe(
      map(actifs => {
        const childrenByParent = this.indexerParSuperieur(actifs);
        const enfants = childrenByParent.get(employeId) ?? [];
        return enfants.map(e => this.toNoeud(e, childrenByParent));
      }),
    );
  }

  // ─── Internes ──────────────────────────────────────────────────────────────

  /**
   * Source unique partagée. Le `shareReplay({ refCount: true })` permet aux
   * appels concurrents (forkJoin du composant) de partager la même requête,
   * et la donnée est rafraîchie à la prochaine entrée sur la page.
   */
  private getActifs(): Observable<DossierEmploye[]> {
    if (!this.employes$) {
      this.employes$ = this.dossierEmployeService.getEmployes(0, 9999, {}).pipe(
        map(page => page.content.filter(e => e.statut !== 'SORTI' && !!e.id)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.employes$;
  }

  private construireArbre(actifs: DossierEmploye[]): NoeudOrganigramme[] {
    const ids = new Set(actifs.map(e => e.id!));
    const childrenByParent = this.indexerParSuperieur(actifs);
    const racines = actifs.filter(
      e => !e.superieurHierarchiqueId || !ids.has(e.superieurHierarchiqueId),
    );
    return racines.map(e => this.toNoeud(e, childrenByParent));
  }

  private indexerParSuperieur(actifs: DossierEmploye[]): Map<string, DossierEmploye[]> {
    const map = new Map<string, DossierEmploye[]>();
    for (const e of actifs) {
      const parentId = e.superieurHierarchiqueId;
      if (!parentId) continue;
      const liste = map.get(parentId);
      if (liste) {
        liste.push(e);
      } else {
        map.set(parentId, [e]);
      }
    }
    return map;
  }

  private toNoeud(
    employe: DossierEmploye,
    childrenByParent: Map<string, DossierEmploye[]>,
  ): NoeudOrganigramme {
    const enfants = (childrenByParent.get(employe.id!) ?? []).map(e =>
      this.toNoeud(e, childrenByParent),
    );
    return {
      id: employe.id!,
      nom: employe.nom,
      prenom: employe.prenom,
      poste: employe.poste,
      departement: employe.departement,
      photoUrl: employe.photoUrl,
      managerId: employe.superieurHierarchiqueId,
      enfants,
    };
  }

  private construireDepartements(actifs: DossierEmploye[]): Departement[] {
    const parDept = new Map<string, DossierEmploye[]>();
    for (const e of actifs) {
      const nom = e.departement;
      if (!nom) continue;
      const liste = parDept.get(nom);
      if (liste) {
        liste.push(e);
      } else {
        parDept.set(nom, [e]);
      }
    }

    const departements: Departement[] = [];
    for (const [nom, employes] of parDept) {
      const idsDept = new Set(employes.map(e => e.id!));
      const candidats = employes.filter(
        e => !e.superieurHierarchiqueId || !idsDept.has(e.superieurHierarchiqueId),
      );
      const responsable = candidats
        .slice()
        .sort((a, b) => this.dateEntreeMs(a) - this.dateEntreeMs(b))[0];

      departements.push({
        id: nom,
        nom,
        effectif: employes.length,
        responsableId: responsable?.id,
        responsableNom: responsable
          ? `${responsable.prenom} ${responsable.nom}`.trim()
          : undefined,
      });
    }

    return departements.sort((a, b) => a.nom.localeCompare(b.nom));
  }

  private dateEntreeMs(employe: DossierEmploye): number {
    if (!employe.dateEntree) return Number.MAX_SAFE_INTEGER;
    const t = new Date(employe.dateEntree).getTime();
    return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
  }
}
