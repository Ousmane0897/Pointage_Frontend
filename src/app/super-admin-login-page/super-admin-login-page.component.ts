import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../services/login.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-super-admin-login-page',
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
    private toastr: ToastrService) { }


  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }


  login() {

    this.loginService.login(this.email, this.password).subscribe({
      next: (res) => {

        // 1️⃣ Stocker le token
        this.loginService.setToken(res.token);

        // 2️⃣ Décoder le token JWT
        console.log("RAW TOKEN = ", res.token);
        const decoded = this.loginService.decodeToken();
        console.log("DECODED TOKEN = ", decoded);
        console.log("DECODED MUST CHANGE =", decoded?.mustChangePassword);


        // 3️⃣ Vérifier si l'utilisateur doit changer son mot de passe
        const mustChangePassword = decoded.mustChangePassword === true;

        // 4️⃣ Afficher un message de succès
        if (decoded.mustChangePassword) {
          this.toastr.info('Veuillez changer votre mot de passe lors de votre première connexion.', 'Information');
        } else {
          this.toastr.success('Connexion réussie !', 'Bienvenue');
        }

        // 5️⃣ Redirection basée sur mustChangePassword
        setTimeout(() => {

          if (mustChangePassword) {
            console.log("Première connexion → redirection vers change-password");
            this.router.navigateByUrl('/change-password');
          } else {
            console.log('Connexion normale → dashboard');
            console.log("Must Change Password:", mustChangePassword);
            this.router.navigateByUrl('/admin/dashboard');
          }

        }, 200);
      },

      error: (err) => {
        const errorMessage = err.error?.message || 'Email ou mot de passe incorrect';
        this.toastr.error(errorMessage, 'Erreur de connexion');
      }
    });
  }

}
