import { Component } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {


  code = '';
  newPassword = '';
  confirmPassword = '';

  constructor(
    private auth: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) { }

  submit() {

    // Verifier que le mot de passe et la confirmation sont identiques avant d'appeler le service
      if (this.newPassword !== this.confirmPassword) {
        this.toastr.error('Les mots de passe ne correspondent pas');
        return;
      }   

    this.auth.resetPassword(this.code, this.newPassword).subscribe({
     next: (res) => {
       console.log("SUCCESS:", res);
       this.toastr.success(res.message);
       this.router.navigate(['']);
     },
     error: (err) => {
       console.log("ERROR:", err);
       this.toastr.error(err.error.message || 'Erreur lors de la réinitialisation du mot de passe');
     }
    });
  }

}
