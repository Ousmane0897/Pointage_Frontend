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


  async ngOnInit() {

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

      if (!navigator.geolocation) {
        reject({ code: -1, message: 'GPS non supporté' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        err => reject(err),
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 0
        }
      );
    });
  }




  async pointer() {
    const codeSecret = String(this.form.get('number')?.value).trim();
    if (!codeSecret) return;

    console.log('Code secret avant GPS:', codeSecret); // 🔥 log mobile

    let location;

    // 🔥 1️⃣ GPS EN PREMIER (clic utilisateur)
    try {
      location = await this.getLocation();
    } catch (err: any) {

      console.error('GPS ERROR', err);

      if (err?.code === 1) {
        this.toastr.error(
          '📍 Localisation refusée.\nActivez la localisation dans le navigateur puis rechargez la page.',
          'Erreur GPS'
        );
      } else if (err?.code === 2) {
        this.toastr.error(
          '📍 Position indisponible.',
          'Erreur GPS'
        );
      } else if (err?.code === 3) {
        this.toastr.error(
          '⏱️ Impossible d’obtenir la position. Réessayez.',
          'Erreur GPS'
        );
      } else {
        this.toastr.error(
          '❌ Erreur GPS.',
          'Erreur'
        );
      }

      return; // ❌ STOP TOUT
    }


    // ✅ 2️⃣ SPINNER APRÈS GPS
    this.spinner.show();

    // ✅ 3️⃣ API (comme AVANT)
    this.pointageService.pointer({
      codeSecret,
      deviceId: this.pointageService.getDeviceId(),
      latitude: location.lat,
      longitude: location.lng
    }).subscribe({
      next: (data) => {
        this.pointage = data;

        setTimeout(() => {
          this.spinner.hide();

          if (this.pointage.heureArrive && !this.pointage.heureDepart) {
            this.router.navigateByUrl('/pagefinal1/' + this.pointage.codeSecret);
          } else {
            this.router.navigateByUrl('/pagefinal2/' + this.pointage.codeSecret);
          }
        }, 4000);
      },
      error: (err) => {
        this.spinner.hide();

        if (err.status === 429) {
          this.toastr.error(
            '⛔ Vous avez déjà pointé récemment avec ce téléphone.',
            'Pointage refusé'
          );
        } else {
          this.toastr.error(
            '❌ Code employé invalide ou inexistant.',
            'Erreur de pointage'
          );
        }
      }
    });
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
