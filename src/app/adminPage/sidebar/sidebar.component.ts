import { CommonModule, NgClass, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { LoginService } from '../../services/login.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterModule,
    NgClass,
    CommonModule,
    NgIf,
    HeaderComponent,
    LucideAngularModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {

  role: string  = '';
  isOpen = true;
  openDropdown: string | null = null;

    ngOnInit(): void {
      
      this.role = this.loginService.getUserRole();
      console.log('ROLE =>', this.role);
  }

  constructor(private router: Router,
    private loginService: LoginService

  ) {}

  toggleSidebar() {
    this.isOpen = !this.isOpen;
  }

  isActive(path: string): boolean { //isActive() prend un chemin en argument et ajoute des styles à ce chemin dans le template. Ex: isActive('/about') ajoute des styles au lien associé à '/about'
    return this.router.url === path;
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigateByUrl('/');
  }

  toggleDropdown(menu: string) {
  this.openDropdown = this.openDropdown === menu ? null : menu;
}

// Permet également d'appliquer des styles aux liens parents lorsque l'un de leurs sous-liens est actif.
isActivePrefix(prefix: string): boolean {
  return this.router.url.startsWith(prefix);
}


}
