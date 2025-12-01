import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { LoginService } from '../services/login.service';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-home-page',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule
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
    this.loginService.login(this.contactForm.get('email')?.value, this.contactForm.get('password')?.value).subscribe({
      next: (res) => {

        // 1️⃣ Stocker le token
        this.loginService.setToken(res.token);

        // 2️⃣ Décoder
        const decoded = this.loginService.decodeToken();
        console.log("TOKEN DECODED :", decoded);

        // 3️⃣ Récupérer les permissions du JWT
        const permissions = decoded.modules || {};
        console.log("MODULES EXTRAITS :", permissions);

        // 4️⃣ Sauvegarder dans localStorage
        localStorage.setItem("modulesAutorises", JSON.stringify(permissions));

        // 5️⃣ Notifier Angular
        this.loginService.notifyPermissionsChanged();

        this.closeForm();
        this.toastr.success('Connexion réussie !', 'Bienvenue');
        setTimeout(() => {
          console.log('role:', this.loginService.getUserRole());
          this.router.navigateByUrl('/admin/dashboard');
        }, 2000);
      },
      error: (err) => {
        const errorMessage = err.error?.error || 'Email ou mot de passe incorrect';
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
