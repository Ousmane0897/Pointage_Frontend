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

  openDropdown: string | null = null; // Variable pour suivre quel dropdown est ouvert
  openDropdownAbsences: string | null = null; // Variable pour suivre quel dropdown est ouvert dans Absences
  openDropdownPointages: string | null = null; // Variable pour suivre quel dropdown est ouvert dans Pointages
  openDropdownStock: string | null = null; // Variable pour suivre quel dropdown est ouvert dans Stock
  openDropdownCollecte: string | null = null; // Variable pour suivre quel dropdown est ouvert dans Collecte


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

  accesStock(): boolean {
    if (this.role === 'SUPERADMIN') return true;

    const m: ModulesAutorises = this.modulesAutorises;

    if (!m) return false;
    return (
      m.stock?.produits ||
      m.stock?.entrees ||
      m.stock?.sorties ||
      m.stock?.suivis ||
      m.stock?.historiquesEntrees ||
      m.stock?.historiquesSorties
    );
  }

  accessAbsences(): boolean {
    if (this.role === 'SUPERADMIN') return true;
    const m: ModulesAutorises = this.modulesAutorises;

    if (!m) return false;
    return (
      m.absences?.tempsReel ||
      m.absences?.historiqueAbsences
    );
  }

  accessPointages(): boolean {
    if (this.role === 'SUPERADMIN') return true;
    const m: ModulesAutorises = this.modulesAutorises;
    if (!m) return false;
    return (
      m.pointages?.pointagesDuJour ||
      m.pointages?.historiquePointages
    );
  }

  accessCollecte(): boolean {
    if (this.role === 'SUPERADMIN') return true;
    const m: ModulesAutorises = this.modulesAutorises;
    if (!m) return false;
    return (
      m.collecteLivraison?.collecteBesoins ||
      m.collecteLivraison?.suiviLivraison
    );
  }

  hasOperationsAccess(): boolean {
    if (this.role === 'SUPERADMIN') return true;

    const m: ModulesAutorises = this.modulesAutorises;

    if (!m) return false;

    return (
      m.statistiquesAgences ||
      m.planifications ||
      m.calendrier ||
      m.employes ||
      m.agences ||
      m.jourFeries ||

      // Collecte & Livraison
      m.collecteLivraison?.collecteBesoins ||
      m.collecteLivraison?.suiviLivraison ||

      // Pointages
      m.pointages?.pointagesDuJour ||
      m.pointages?.historiquePointages ||

      // Absences
      m.absences?.tempsReel ||
      m.absences?.historiqueAbsences ||


      // Stock    
      m.stock?.entrees ||
      m.stock?.sorties ||
      m.stock?.suivis ||
      m.stock?.historiquesEntrees ||
      m.stock?.historiquesSorties
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


  hasAnyOperationPermission(): boolean {
    if (this.role === 'SUPERADMIN') return true;

    const ops = [
      'StatistiquesAgences',
      'Planifications',
      'Calendrier',
      'Stock',
      'CollecteLivraison',
      'JourFeries',
      'Employes',
      'Agences',
      'Absences',
      'Pointages',
    ];

    return ops.some(p => this.modulesAutorises?.[p] === true);
  }




  logout() {
    localStorage.removeItem('token');
    this.router.navigateByUrl('/');
  }

  toggleDropdown(menu: string) {
    this.openDropdown = this.openDropdown === menu ? null : menu;
  }

  toggleDropdownAbsences(menu: string) {
    this.openDropdownAbsences = this.openDropdownAbsences === menu ? null : menu;
  }

  toggleDropdownPointages(menu: string) {
    this.openDropdownPointages = this.openDropdownPointages === menu ? null : menu;
  }

  toggleDropdownStock(menu: string) {
    this.openDropdownStock = this.openDropdownStock === menu ? null : menu;
  }

  toggleDropdownCollecte(menu: string) {
    this.openDropdownCollecte = this.openDropdownCollecte === menu ? null : menu;
  }


  // Permet également d'appliquer des styles aux liens parents lorsque l'un de leurs sous-liens est actif.
  isActivePrefix(prefix: string): boolean {
    return this.router.url.startsWith(prefix);
  }


}
