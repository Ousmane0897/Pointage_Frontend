import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLinkWithHref } from '@angular/router';
import { LoginService } from '../services/login.service';
import { ToastrService } from 'ngx-toastr';
import { PointageService } from '../services/pointage.service';
import { PointageQrContexteService } from '../services/pointage-qr-contexte.service';
import { PARAM_QR_POINTAGE } from '../constants/pointage.constants';


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

  /** Agence du QR scanné (affichée avant le PIN), ou `null` si aucun QR valide. */
  agenceQr: string | null = null;
  /** Vrai si un QR a été scanné mais n'est pas reconnu par le serveur. */
  qrInvalide = false;

  constructor(private router: Router, private fb: FormBuilder, private loginService: LoginService
    , private toastr: ToastrService, private route: ActivatedRoute,
    private pointageService: PointageService, private qrContexte: PointageQrContexteService) {
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

        // 3️⃣ Propager les permissions depuis le claim `modules` du JWT
        this.loginService.notifyPermissionsChanged();

        this.closeForm();
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
            this.router.navigateByUrl('/admin/exploitation-v2/dashboard');
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

    this.lireQrAgence();
  }

  /**
   * QR d'agence : le QR imprimé ouvre `/home?qr=POINTIC:AG:<token>`. Le payload est
   * mémorisé (10 min) pour être joint au pointage, puis retiré de l'URL — un retour
   * arrière ou un rafraîchissement ne doit pas réarmer un scan déjà consommé.
   */
  private lireQrAgence(): void {
    const qr = this.route.snapshot.queryParamMap.get(PARAM_QR_POINTAGE);
    if (qr) {
      this.qrContexte.memoriser(qr);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { [PARAM_QR_POINTAGE]: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    const payload = this.qrContexte.payloadValide();
    if (!payload) {
      return;
    }
    // Le nom n'est qu'un repère pour l'agent : c'est le serveur qui valide au pointage.
    this.pointageService.nomAgenceQr(payload).subscribe({
      next: (r) => {
        this.agenceQr = r.nom;
        this.qrInvalide = false;
      },
      error: () => {
        this.agenceQr = null;
        this.qrInvalide = true;
      },
    });
  }

  CodePinPage() {
    this.router.navigateByUrl('/code-pin');
  }
}
