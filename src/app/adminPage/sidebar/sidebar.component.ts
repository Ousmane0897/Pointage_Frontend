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

  private readonly RACINE_CONGES = '/admin/rh/temps-et-presences/conges';
  private readonly RACINE_ABSENCES = '/admin/rh/temps-et-presences/absences';

  private readonly RACINE_BONS_ENTREE = '/admin/stock-v2/controle-mouvements/bons-entree';
  private readonly RACINE_BONS_SORTIE = '/admin/stock-v2/controle-mouvements/bons-sortie';

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
    return this.loginService.accesRh(feature);
  }

  /** Accès au sous-module 6.1 Gestion du Personnel (au moins une fonctionnalité). */
  accessGestionPersonnel(): boolean {
    return this.accessRh('dossierEmploye')
      || this.accessRh('contrats')
      || this.accessRh('organigramme')
      || this.accessRh('documents');
  }

  /**
   * Accès au sous-module 6.2 Temps & Présences (au moins une fonctionnalité).
   *
   * ⚠ `conges`, `absences` et `congesMesDemandes` n'y figurent PAS : la rubrique
   * « Congés » a quitté ce sous-menu pour devenir une entrée de premier niveau
   * visible par tous. Les y laisser afficherait un sous-menu « Présences » vide
   * pour un profil ne portant que ces flags.
   */
  accessTempsPresences(): boolean {
    return this.accessRh('pointageCentralise')
      || this.accessCongesValidation()
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

  /**
   * Rubrique « Congés » — onglets Calendrier (`/conges`), Déclarations (`/absences`)
   * et Mes demandes (`/conges/mes-demandes`).
   *
   * ⚠ Un simple `isActivePrefix('/conges')` capterait aussi `/conges/validation`, qui
   * reste une entrée de menu distincte. On énumère donc les routes de la rubrique, plus
   * les sous-routes sans entrée propre : le formulaire (`/conges/demande`) et la fiche
   * (`/conges/demandes/:id`, ciblée par les liens des e-mails) — le préfixe
   * `/conges/demande` couvre volontairement les deux.
   */
  estRubriqueConges(): boolean {
    const url = this.router.url.split(/[?#]/)[0];
    return url === this.RACINE_CONGES
      || url.startsWith(this.RACINE_ABSENCES)
      || url.startsWith(`${this.RACINE_CONGES}/mes-demandes`)
      || url.startsWith(`${this.RACINE_CONGES}/demande`);
  }

  /**
   * Onglet d'atterrissage de la rubrique, selon les droits : le calendrier, à défaut les
   * déclarations, à défaut l'auto-service — seul écran ouvert à tout compte connecté.
   */
  lienRubriqueConges(): string {
    if (this.accessRh('conges')) return this.RACINE_CONGES;
    if (this.accessRh('absences')) return this.RACINE_ABSENCES;
    return `${this.RACINE_CONGES}/mes-demandes`;
  }

  /**
   * Rubrique « Bons » — onglets Entrée et Sortie, deux préfixes de routes sœurs.
   *
   * Un simple `startsWith` suffit ici, contrairement à `estRubriqueConges()` : aucune autre
   * entrée de menu ne vit sous ces deux préfixes, les sous-routes (`/nouveau`, `/:id`,
   * `/:id/modifier`) appartiennent donc toutes à la rubrique.
   */
  estRubriqueBons(): boolean {
    const url = this.router.url.split(/[?#]/)[0];
    return url.startsWith(this.RACINE_BONS_ENTREE) || url.startsWith(this.RACINE_BONS_SORTIE);
  }

  /** Onglet d'atterrissage de la rubrique : les entrées, ou les sorties si c'est le seul droit. */
  lienRubriqueBons(): string {
    return this.hasAccess('stock.bonsEntree') ? this.RACINE_BONS_ENTREE : this.RACINE_BONS_SORTIE;
  }


}
