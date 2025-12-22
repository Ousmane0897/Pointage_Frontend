import { CommonModule, NgClass, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { LucideAngularModule } from 'lucide-angular';

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

  modulesAutorises: any = {}; // Objet pour stocker les modules autorisés de l'utilisateur

  ngOnInit(): void {

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

  hasPermission(module: string): boolean {
    return this.modulesAutorises && this.modulesAutorises[module] === true;
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
