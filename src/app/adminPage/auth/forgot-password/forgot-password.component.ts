import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {


  email = '';

  constructor(
    private auth: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) { }

  loading = false;

submit() {
  if (!this.email) return;

  this.loading = true;

  this.auth.forgotPassword(this.email).subscribe({
    next: (res) => {
      this.loading = false;
      console.log("SUCCESS:", res);
      this.toastr.success(res.message);
      this.router.navigate(['/reset-password']);
    },
    error: (err) => {
      this.loading = false;
      console.log("ERROR:", err);
      this.toastr.error("Email introuvable");
    }
  });
}



}
