import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LoginService } from '../services/login.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-changement-password',
  imports: [CommonModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule],
  templateUrl: './changement-password.component.html',
  styleUrl: './changement-password.component.scss'
})
export class ChangementPasswordComponent implements OnInit {

  constructor(private loginService: LoginService, private toastr: ToastrService, private router: Router) { }

  ngOnInit(): void {
    this.role = this.loginService.getUserRole();
    this.poste = this.loginService.getUserPoste();
    this.model.role = this.role; // Initialiser le rôle dans le modèle
  }


  role: string | null = null;
  poste: string | null = null;

  model = {
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    role: this.role,
  };

  submit(form: NgForm) {

    // Validate form inputs
    if (form.invalid) {
      this.toastr.error('Veuillez remplir tous les champs correctement', 'Erreur');
      return;
    }

    const email = this.loginService.getUserEmail();
    if (!email) {
      this.toastr.error('Utilisateur non identifié', 'Erreur');
      return;
    }

    this.loginService.changePassword(email, this.model.oldPassword, this.model.newPassword, this.model.confirmNewPassword, this.model.role)
      .subscribe({
        next: res => {
          console.log("Réponse backend :", res);

          if (res.token) {
            localStorage.setItem("token", res.token);
          }

          this.toastr.success(res.message || 'Mot de passe changé', 'Succès');
          this.router.navigate(['admin/dashboard']);
        },
        error: err => {
          this.toastr.error(err.error?.message || 'Erreur lors du changement', 'Erreur');
        }
      });
  }


}