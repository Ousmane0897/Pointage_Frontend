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

    const codeSecret = this.form.get('number')?.value
      ?.toString()
      .replace(/[^0-9]/g, '');

    if (!codeSecret) {
      this.toastr.error('Code invalide', 'Erreur');
      return;
    }

    let location;

    // 🔵 1️⃣ GPS AVANT TOUT
    try {
      location = await this.getLocation();
      console.log('📍 GPS FINAL:', location.lat, location.lng);

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

      return; // ❌ STOP TOTAL
    }

    // ✅ 2️⃣ SPINNER APRÈS GPS
    this.spinner.show();

    // ✅ 3️⃣ APPEL API
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

        console.error('API ERROR:', err);

        if (err.status === 404) {

          this.toastr.error(
            '❌ Code employé invalide.',
            'Erreur de pointage'
          );

        } else if (err.status === 429) {

          this.toastr.error(
            '⛔ Vous avez déjà pointé récemment.',
            'Pointage refusé'
          );

        } else {

          this.toastr.error(
            'Erreur ' + err.status,
            'Erreur serveur'
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
