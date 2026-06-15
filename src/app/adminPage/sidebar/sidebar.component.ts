import { CommonModule, NgClass, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { LucideAngularModule } from 'lucide-angular';
import { DropdownMenu, ModulesAutorises } from '../../models/admin.model';

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
  openDropdownProductionChimie: string | null = null; // Sous-menu Production Chimie
  openDropdownTerrain: string | null = null; // Sous-menu Exploitation Terrain (5.2)

  modulesAutorises: any = {}; // Objet pour stocker les modules autorisés de l'utilisateur

  ngOnInit(): void {

    console.log('ROLE =', this.role);
    console.log('TYPE ROLE =', typeof this.role);
    console.log('PERMISSIONS RAW =', this.modulesAutorises);

    Object.entries(this.modulesAutorises || {}).forEach(([k, v]) => {
      console.log(k, v, typeof v);
    });


    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    // ✅ récupérer les permissions sauvegardées
    this.modulesAutorises = this.loginService.getUserPermissions();

    console.log("Permissions chargées :", this.modulesAutorises);

    // optionnel : écouter les changements en live
    this.loginService.permissions$.subscribe(modules => {
      this.modulesAutorises = modules;
    });

    this.role = this.loginService.getUserRole();
  }



  constructor(private router: Router,
    private loginService: LoginService

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

  accessRessourcesHumaines(): boolean {
    if (this.role === 'SUPERADMIN' || this.role === 'RH') return true;
    const m: ModulesAutorises = this.modulesAutorises;
    if (!m) return false;
    return m.rh;
  }

  /** Accès à la nouvelle section Exploitation v2 (au moins une fonctionnalité Production Chimie OU Terrain). */
  accessExploitationV2(): boolean {
    if (this.role === 'SUPERADMIN') return true;
    const m: ModulesAutorises = this.modulesAutorises;
    if (!m) return false;
    return this.accessProductionChimie() || this.accessTerrain();
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

  toggleDropdownProductionChimie(menu: string) {
    this.openDropdownProductionChimie = this.openDropdownProductionChimie === menu ? null : menu;
  }

  toggleDropdownTerrain(menu: string) {
    this.openDropdownTerrain = this.openDropdownTerrain === menu ? null : menu;
  }


  // Permet également d'appliquer des styles aux liens parents lorsque l'un de leurs sous-liens est actif.
  isActivePrefix(prefix: string): boolean {
    return this.router.url.startsWith(prefix);
  }


}
