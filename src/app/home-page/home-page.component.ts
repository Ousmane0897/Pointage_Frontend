import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLinkWithHref } from '@angular/router';
import { LoginService } from '../services/login.service';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-home-page',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    RouterLinkWithHref
],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {
  showPassword: boolean = false;


  togglePasswordVisibility() {

    this.showPassword = !this.showPassword;
  }

  logoMoved = false;
  showForm = false;
  toastMessage: string | null = null;
  toastTimeout: any;
  prenomNom: string | null = null;
  role: string | null = null;
  poste: string | null = null;


  contactForm: FormGroup;

  constructor(private router: Router, private fb: FormBuilder, private loginService: LoginService
    , private toastr: ToastrService) {
    this.contactForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
  }

  closeForm() {
    this.showForm = false;
  }




  login() {
  const email = this.contactForm.get('email')?.value;
  const password = this.contactForm.get('password')?.value;

  this.loginService.login(email, password).subscribe({
    next: (res) => {

      // 1️⃣ Stocker le token
      this.loginService.setToken(res.token);

      // 2️⃣ Décoder le token JWT
      const decoded = this.loginService.decodeToken();
      console.log("TOKEN DECODED :", decoded);

      // 2.1️⃣ Vérifier si l'utilisateur doit changer son mot de passe
      const mustChangePassword = decoded.mustChangePassword === true;

      // 3️⃣ Récupérer les permissions depuis le JWT (si tu les utilises)
      const permissions = decoded.modules || {};
      localStorage.setItem("modulesAutorises", JSON.stringify(permissions));

      // 4️⃣ Notifier le frontend des changements de permissions
      this.loginService.notifyPermissionsChanged();

      this.closeForm();
      if(decoded.mustChangePassword) {
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



  SuperAdminLogin() {
    this.router.navigateByUrl('/super-admin-login');
  }

  showToast(message: string) {
    this.toastMessage = message;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = null;
    }, 3000);
  }




  ngOnInit(): void {
    setTimeout(() => {
      this.logoMoved = true;
    }, 2000); // 2-second delay before moving the logo
  }

  CodePinPage() {
    this.router.navigateByUrl('/code-pin');
  }
}
