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
  standalone: true,
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

  logoMoved = false;
  showForm = false;
  toastMessage: string | null = null;
  toastTimeout: any;


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
        this.loginService.setToken(res.token);
        this.closeForm();
        this.toastr.success('Connexion réussie !', 'Bienvenue');
        setTimeout(() => {
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
