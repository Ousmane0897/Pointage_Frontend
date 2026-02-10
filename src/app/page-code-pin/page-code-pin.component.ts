import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { PointageService } from '../services/pointage.service';
import { Router } from '@angular/router';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { Pointage } from '../models/pointage.model';
import { PageCodeService } from '../services/page-code.service';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';




@Component({
  selector: 'app-page-code-pin',
  imports: [
    MatIconModule,
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    NgxSpinnerModule
  ],
  templateUrl: './page-code-pin.component.html',
  styleUrl: './page-code-pin.component.scss'
})
export class PageCodePinComponent implements OnInit {




  form: FormGroup;

  code: string = '';
  message: string = '';
  toastMessage: string | null = null;
  toastTimeout: any;
  pointage!: Pointage;


  ngOnInit(): void {
   // this.getPointage();

  }

  getPointage() {
    this.pagecodeService.getPointageById(this.form.value).subscribe(data => {
      this.pointage = data
    });
  }


  constructor(private fb: FormBuilder,
    private pointageService: PointageService, private router: Router, private spinner: NgxSpinnerService,
    private pagecodeService: PageCodeService, private toastr: ToastrService) {
    this.form = this.fb.group({
      number: ['', [Validators.required, Validators.pattern(/^\d+$/)]]
    });


  }


  OpenSpinner() {
    this.spinner.show();
    setTimeout(() => {
      this.spinner.hide();
    }, 4000); // Masque le spinner après 4 secondes 
  }


  // Obtenir la position GPS de l'utilisateur
  /**
   * 
   * Une Promise (ou « promesse » en français) est un objet en JavaScript qui représente la valeur d’une opération asynchrone 
   * qui n’est pas encore terminée, mais qui le sera dans le futur. C’est un moyen de gérer des opérations qui prennent du temps, 
   * comme des appels API, des lectures de fichiers, ou des timers, sans bloquer le reste du code.
   */
  getLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
        error => {
          switch (error.code) {
            case 1:
              reject(new Error('Permission GPS refusée')); // L'utilisateur a refusé la demande de géolocalisation
              break;
            case 2:
              reject(new Error('Position GPS indisponible')); // Le service de localisation ne peut pas déterminer la position actuelle
              break;
            case 3:
              reject(new Error('Timeout GPS')); // La demande de géolocalisation a expiré
              break;
            default:
              reject(new Error('Erreur GPS inconnue'));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }



  async pointer() {
    const codeSecret = this.form.get('number')?.value;

    if (!codeSecret) return;

    this.spinner.show();

    try {
      // 1️⃣ GPS
      const location = await this.getLocation();

      // 2️⃣ API
      this.pointage = await firstValueFrom(
        this.pointageService.pointer({
          codeSecret,
          deviceId: this.pointageService.getDeviceId(),
          latitude: location.lat,
          longitude: location.lng
        })
      );

      // 3️⃣ Navigation logique
      if (this.pointage.heureArrive && !this.pointage.heureDepart) {
        this.router.navigateByUrl('/pagefinal1/' + this.pointage.codeSecret);
      } else if (this.pointage.heureArrive && this.pointage.heureDepart) {
        this.router.navigateByUrl('/pagefinal2/' + this.pointage.codeSecret);
      }

    } catch (err: any) {
      
      console.error('GPS ERROR', err);
      if (err?.status === 429) {
        this.toastr.error(
          '⛔ Vous avez déjà pointé récemment avec ce téléphone.',
          'Pointage refusé'
        );
      } else if (err?.message?.includes('GPS')) {
        this.toastr.error(
          'Impossible de récupérer votre position',
          'Erreur GPS'
        );
      } else {
        this.toastr.error(
          '❌ Code employé invalide ou inexistant.',
          'Erreur de pointage'
        );
      }

    } finally {
      this.spinner.hide();
    }
  }

  async testGPSMobile() {
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
    console.log('GPS OK', pos.coords);
  } catch (err: any) {
    console.error('Erreur GPS mobile', err.code, err.message);
  }
}







  homePage() {
    this.router.navigateByUrl('/');
  }



}
