import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../services/login.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-super-admin-login-page',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule
  ],
  templateUrl: './super-admin-login-page.component.html',
  styleUrl: './super-admin-login-page.component.scss'
})
export class SuperAdminLoginPageComponent {
onSubmit() {
throw new Error('Method not implemented.');
}

  email: string = '';
  password: string = '';
  showPassword: boolean = false;

  constructor(private router: Router, 
    private loginService: LoginService,
  private toastr: ToastrService) {}


  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  login() {
    this.loginService.login(this.email,this.password).subscribe({
      next: (res) => {
        this.loginService.setToken(res.token);
         // Redirection vers la page admin après la connexion
        this.toastr.success('Connexion réussie !', 'Bienvenue');
        setTimeout(() => {
          this.router.navigateByUrl('/admin/dashboard');
        }, 2000); // Délai de 2 seconde avant la redirection
       },
      error: () => {
        this.toastr.error('Email ou mot de passe incorrect', 'Erreur de connexion');
      }
    });
  }
  
}
