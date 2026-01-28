import { CommonModule, NgClass, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { LucideAngularModule } from 'lucide-angular';
import { ModulesAutorises } from '../../models/admin.model';

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
  openDropdown: string | null = null;
  openDropdownAbsent: string | null = null;
  openDropdownEmploye: string | null = null;
  openDropdownCollecte: string | null = null;
  openDropdownOperations: string | null = null;

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
    this.role = this.loginService.getUserRole();

    // Lire immédiatement
    this.modulesAutorises = this.loginService.getUserPermissions();
    console.log("Modules chargés :", this.modulesAutorises);

    // Mettre à jour en live après login
    this.loginService.permissions$.subscribe(modules => {
      console.log("Modules mis à jour :", modules);
      this.modulesAutorises = modules;
    });
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



  toggleDropdownEmploye(menu: string) {
    this.openDropdownEmploye = this.openDropdownEmploye === menu ? null : menu;
  }

  toggleDropdownOperations(menu: string) {
    this.openDropdownOperations = this.openDropdownOperations === menu ? null : menu;
  }

  toggleDropdownCollecte(menu: string) {
    this.openDropdownCollecte = this.openDropdownCollecte === menu ? null : menu;
  }

  toggleDropdownAbsent(menu: string) {
    this.openDropdownAbsent = this.openDropdownAbsent === menu ? null : menu;
  }

  // Permet également d'appliquer des styles aux liens parents lorsque l'un de leurs sous-liens est actif.
  isActivePrefix(prefix: string): boolean {
    return this.router.url.startsWith(prefix);
  }


}
