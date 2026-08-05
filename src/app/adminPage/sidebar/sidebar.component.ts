import { CommonModule, NgClass, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { LucideAngularModule } from 'lucide-angular';
import { DropdownMenu, ModulesAutorises } from '../../models/admin.model';
import { CongeService } from '../../services/conge.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterModule,
    NgClass,
    CommonModule,
    NgIf,
    LucideAngularModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {

  role: string = '';
  isOpen = true;

  openDropdownRessourcesHumaines: string | null = null; // Variable pour suivre quel dropdown est ouvert dans Ressources Humaines
  openDropdownGestionPersonnel: string | null = null; // Variable pour suivre quel dropdown est ouvert dans Gestion du Personnel
  openDropdownTempsPresences: string | null = null; // Variable pour suivre quel dropdown est ouvert dans Temps & Présences
  openDropdownPaie: string | null = null; // Variable pour suivre quel dropdown est ouvert dans Paie
  openDropdownDeveloppementRh: string | null = null; // Variable pour suivre quel dropdown est ouvert dans Développement RH
  openDropdownExploitationV2: string | null = null; // Variable pour la nouvelle section Exploitation v2
  openDropdownIndustrie: string | null = null; // Section Industrie (regroupe Production Chimie)
  openDropdownProductionChimie: string | null = null; // Sous-menu Production Chimie
  openDropdownTerrain: string | null = null; // Sous-menu Exploitation Terrain (5.2)
  openDropdownStockV2: string | null = null; // Parent regroupant les 4 sous-modules Stock (7.3 → 7.6)
  openDropdownStock: string | null = null; // Sous-menu actif parmi les 4 sous-modules Stock (accordéon)

  modulesAutorises: any = {}; // Objet pour stocker les modules autorisés de l'utilisateur

  /** Demandes de congé en attente de l'action de l'utilisateur (pastille du menu). */
  nbCongesAValider = 0;

  ngOnInit(): void {

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    // ✅ récupérer les permissions sauvegardées
    this.modulesAutorises = this.loginService.getUserPermissions();

    // écouter les changements en live (on ignore une émission vide pour ne
    // pas écraser les permissions déjà chargées, ex. au rafraîchissement)
    this.loginService.permissions$.subscribe(modules => {
      if (modules && Object.keys(modules).length > 0) {
        this.modulesAutorises = modules;
      }
    });

    this.role = this.loginService.getUserRole();

    this.chargerCompteurConges();
  }

  /**
   * Pastille « Validation congés ». Un seul appel, uniquement pour les profils
   * habilités ; l'échec est silencieux (le menu reste utilisable sans compteur).
   */
  private chargerCompteurConges(): void {
    if (!this.accessCongesValidation()) return;
    this.congeService.compterAValider()
      .pipe(catchError(() => of({ total: 0, parNiveau: {} as any })))
      .subscribe(c => (this.nbCongesAValider = c.total ?? 0));
  }



  constructor(private router: Router,
    private loginService: LoginService,
    private congeService: CongeService

  ) { }

  handleResize() {
    const width = window.innerWidth;

    // Tablette
    if (width >= 768 && width < 1024) {
      this.isOpen = false;
    }

    // PC
    if (width >= 1024) {
      this.isOpen = true;
    }
  }

  /**
   * Accès à une fonctionnalité RH précise. Rétrocompatible : un ancien
   * claim `rh: true` (booléen) accorde l'accès à toutes les fonctionnalités.
   */
  accessRh(feature: string): boolean {
    if (this.role === 'SUPERADMIN' || this.role === 'RH') return true;
    const m: ModulesAutorises = this.modulesAutorises;
    if (!m) return false;
    const rh: any = m.rh;
    if (rh === true) return true;          // legacy booléen
    if (!rh) return false;
    return !!rh[feature];
  }

  /** Accès au sous-module 6.1 Gestion du Personnel (au moins une fonctionnalité). */
  accessGestionPersonnel(): boolean {
    return this.accessRh('dossierEmploye')
      || this.accessRh('contrats')
      || this.accessRh('organigramme')
      || this.accessRh('documents');
  }

  /** Accès au sous-module 6.2 Temps & Présences (au moins une fonctionnalité). */
  accessTempsPresences(): boolean {
    return this.accessRh('pointageCentralise')
      || this.accessRh('absences')
      || this.accessRh('conges')
      || this.accessCongesValidation()
      || this.accessRh('congesMesDemandes')
      || this.accessRh('heuresSupplementaires')
      || this.accessRh('recapitulatif');
  }

  /**
   * Accès à la file de validation des congés.
   *
   * Le rôle `RH` (niveau 2) et `SUPERADMIN` (niveau 3, la Direction générale)
   * y accèdent d'office. Pour un supérieur hiérarchique sans rôle particulier,
   * c'est le backend qui pose `modules.rh.congesValidation` au login dès que
   * l'employé a au moins un subordonné — la sidebar ne fait aucun calcul.
   */
  accessCongesValidation(): boolean {
    return this.accessRh('congesValidation');
  }

  /** Accès au sous-module 6.3 Paie (au moins une fonctionnalité). */
  accessPaie(): boolean {
    return this.accessRh('grilleSalariale')
      || this.accessRh('calculBulletin')
      || this.accessRh('historiquePaies')
      || this.accessRh('declarations');
  }

  /** Accès au sous-module 6.4 Développement RH (au moins une fonctionnalité). */
  accessDeveloppementRh(): boolean {
    return this.accessRh('formations')
      || this.accessRh('evaluations')
      || this.accessRh('sanctions')
      || this.accessRh('tableauBordRh');
  }

  /** Accès au menu Ressources humaines parent (au moins un sous-module accessible). */
  accessRessourcesHumaines(): boolean {
    if (this.role === 'SUPERADMIN' || this.role === 'RH') return true;
    return this.accessGestionPersonnel()
      || this.accessTempsPresences()
      || this.accessPaie()
      || this.accessDeveloppementRh();
  }

  /** Accès à la section Industrie (regroupe Production Chimie). */
  accessIndustrie(): boolean {
    if (this.role === 'SUPERADMIN') return true;
    return this.accessProductionChimie();
  }

  /** Accès au sous-module Production Chimie (5.1). */
  accessProductionChimie(): boolean {
    if (this.role === 'SUPERADMIN') return true;
    const m: ModulesAutorises = this.modulesAutorises;
    if (!m || !m.productionChimie) return false;
    const pc = m.productionChimie;
    return !!(
      pc.formulations ||
      pc.ordresFabrication ||
      pc.lots ||
      pc.controleQualite ||
      pc.matieresPremieres ||
      pc.conditionnement ||
      pc.tableauBord
    );
  }

  /** Accès au sous-module Exploitation Terrain (5.2). */
  accessTerrain(): boolean {
    if (this.role === 'SUPERADMIN') return true;
    const m: ModulesAutorises = this.modulesAutorises;
    if (!m || !m.terrain) return false;
    const t = m.terrain;
    return !!(
      t.sitesClients ||
      t.planning ||
      t.pointage ||
      t.alertes ||
      t.interventions ||
      t.controleQualite ||
      t.materiel ||
      t.phytosanitaire ||
      t.tableauBord
    );
  }

  /** Accès au module Stock v2 (7.3) — au moins une fonctionnalité autorisée. */
  accessStock(): boolean {
    if (this.role === 'SUPERADMIN') return true;
    const m: ModulesAutorises = this.modulesAutorises;
    if (!m || !m.stock) return false;
    const s = m.stock;
    return !!(
      s.catalogue ||
      s.mouvements ||
      s.etatStock ||
      s.inventaires ||
      s.synthese ||
      s.approvisionnement ||
      s.tableauBord
    );
  }

  /** Accès au module Stock v2 (7.4 Contrôle des mouvements) — au moins une fonctionnalité. */
  accessControleMouvements(): boolean {
    if (this.role === 'SUPERADMIN') return true;
    const m: ModulesAutorises = this.modulesAutorises;
    if (!m || !m.stock) return false;
    const s = m.stock;
    return !!(
      s.categorisation ||
      s.bonsEntree ||
      s.bonsSortie ||
      s.workflowValidation ||
      s.historiqueDestinataire ||
      s.plafonds ||
      s.dotation ||
      s.rapportsConso
    );
  }

  /** Accès à la section 7.5 Analyse des consommations (au moins un sous-flag). */
  accessAnalyseConsommations(): boolean {
    if (this.role === 'SUPERADMIN') return true;
    const m: ModulesAutorises = this.modulesAutorises;
    if (!m || !m.stock) return false;
    const s = m.stock;
    return !!(
      s.analyseMensuelle ||
      s.chantiers ||
      s.dons ||
      s.comparatif ||
      s.filtresCroises
    );
  }

  /** Accès à la section 7.6 Valorisation financière (au moins un sous-flag). */
  accessValorisationFinanciere(): boolean {
    if (this.role === 'SUPERADMIN') return true;
    const m: ModulesAutorises = this.modulesAutorises;
    if (!m || !m.stock) return false;
    const s = m.stock;
    return !!(
      s.coutUnitaire ||
      s.coutMouvements ||
      s.valeurStock ||
      s.coutSite ||
      s.coutChantier ||
      s.marges ||
      s.tableauBordFinancier
    );
  }

  /** Accès au menu Stock parent (au moins un des 4 sous-modules accessible). */
  accessStockV2(): boolean {
    return this.accessStock()
      || this.accessControleMouvements()
      || this.accessAnalyseConsommations()
      || this.accessValorisationFinanciere();
  }

  toggleSidebar() {
    this.isOpen = !this.isOpen;
  }

  isActive(path: string): boolean { //isActive() prend un chemin en argument et ajoute des styles à ce chemin dans le template. Ex: isActive('/about') ajoute des styles au lien associé à '/about'
    return this.router.url === path;
  }

  hasPermission(permission: keyof ModulesAutorises): boolean {
    if (this.role === 'SUPERADMIN') return true;
    return this.modulesAutorises?.[permission] === true;
  }

  hasAccess(path: string): boolean {

    if (this.role === 'SUPERADMIN') {
      return true;
    }

    const keys = path.split('.');
    let current = this.modulesAutorises;

    for (const key of keys) {

      if (!current || current[key] === undefined) {
        return false;
      }

      current = current[key];
    }

    return current === true;
  }


  logout() {
    localStorage.removeItem('token');
    this.router.navigateByUrl('/');
  }

  toggleDropdownRessourcesHumaines(menu: string) {
    this.openDropdownRessourcesHumaines = this.openDropdownRessourcesHumaines === menu ? null : menu;
  }

  toggleDropdownGestionPersonnel(menu: string) {
    this.openDropdownGestionPersonnel = this.openDropdownGestionPersonnel === menu ? null : menu;
  }

  toggleDropdownTempsPresences(menu: string) {
    this.openDropdownTempsPresences = this.openDropdownTempsPresences === menu ? null : menu;
  }

  toggleDropdownPaie(menu: string) {
    this.openDropdownPaie = this.openDropdownPaie === menu ? null : menu;
  }

  toggleDropdownDeveloppementRh(menu: string) {
    this.openDropdownDeveloppementRh = this.openDropdownDeveloppementRh === menu ? null : menu;
  }

  toggleDropdownExploitationV2(menu: string) {
    this.openDropdownExploitationV2 = this.openDropdownExploitationV2 === menu ? null : menu;
  }

  toggleDropdownIndustrie(menu: string) {
    this.openDropdownIndustrie = this.openDropdownIndustrie === menu ? null : menu;
  }

  toggleDropdownProductionChimie(menu: string) {
    this.openDropdownProductionChimie = this.openDropdownProductionChimie === menu ? null : menu;
  }

  toggleDropdownTerrain(menu: string) {
    this.openDropdownTerrain = this.openDropdownTerrain === menu ? null : menu;
  }

  toggleDropdownStockV2(menu: string) {
    this.openDropdownStockV2 = this.openDropdownStockV2 === menu ? null : menu;
  }

  toggleDropdownStock(menu: string) {
    this.openDropdownStock = this.openDropdownStock === menu ? null : menu;
  }


  // Permet également d'appliquer des styles aux liens parents lorsque l'un de leurs sous-liens est actif.
  isActivePrefix(prefix: string): boolean {
    return this.router.url.startsWith(prefix);
  }


}
