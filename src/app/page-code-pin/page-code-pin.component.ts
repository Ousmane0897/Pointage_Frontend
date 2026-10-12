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
import { ConfirmationPointage, Pointage, PointageResultat } from '../models/pointage.model';
import { PointageQrContexteService } from '../services/pointage-qr-contexte.service';
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
  isSubmitting = false;


  async ngOnInit() {

  }


  getPointage() {
    this.pagecodeService.getPointageById(this.form.value).subscribe(data => {
      this.pointage = data
    });
  }


  constructor(private fb: FormBuilder,
    private pointageService: PointageService, private router: Router, private spinner: NgxSpinnerService,
    private pagecodeService: PageCodeService, private toastr: ToastrService,
    private qrContexte: PointageQrContexteService) {
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
  getLocation(): Promise<{ lat: number; lng: number; precision?: number }> {
    return new Promise((resolve, reject) => {

      if (!navigator.geolocation) {
        reject({ code: -1, message: 'GPS non supporté' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            // Précision annoncée par l'appareil : informative côté serveur (anomalie
            // au-delà de 100 m), elle n'élargit jamais la tolérance de l'agence.
            precision: pos.coords.accuracy
          });
        },
        err => reject(err),
        {
          // Haute précision : la position est comparée au rayon de l'agence scannée.
          enableHighAccuracy: true,
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

    // 🔒 Verrou anti double-clic : on bloque tant qu'un pointage est en cours
    if (this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;

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

      this.isSubmitting = false; // 🔓 réarme le bouton après échec GPS
      return; // ❌ STOP TOTAL
    }

    // ✅ 2️⃣ SPINNER APRÈS GPS
    this.spinner.show();

    // ✅ 3️⃣ APPEL API — avec le QR d'agence s'il a été scanné il y a moins de 10 min.
    this.pointageService.pointer({
      codeSecret,
      deviceId: this.pointageService.getDeviceId(),
      latitude: location.lat,
      longitude: location.lng,
      precisionMetres: location.precision,
      qrPayload: this.qrContexte.payloadValide()
    }).subscribe({
      next: (data) => {
        this.pointage = data;
        // ⚠ Consommé : le prochain pointage (souvent le départ, parfois dans une autre
        // agence) doit repartir d'un nouveau scan, jamais de celui-ci.
        this.qrContexte.effacer();

        const confirmation = this.confirmation(data);
        this.toastr.success(this.messageConfirmation(confirmation), 'Pointage enregistré');
        if (confirmation.avertissement) {
          this.toastr.warning(confirmation.avertissement, 'Pointage signalé',
            { disableTimeOut: true, closeButton: true });
        }

        setTimeout(() => {
          this.spinner.hide();

          const page = confirmation.type === 'ENTREE' ? '/pagefinal1/' : '/pagefinal2/';
          this.router.navigateByUrl(page + this.pointage.codeSecret, { state: { confirmation } });
        }, 4000);
      },
      error: (err) => {

        this.spinner.hide();
        this.isSubmitting = false; // 🔓 réarme le bouton pour permettre un nouvel essai

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

        } else if (err.status === 422) {

          // Refus du scan (QR non reconnu, hors zone de l'agence, hors affectation…) :
          // le message serveur est rédigé pour l'agent et nomme l'agence.
          this.toastr.error(
            err.error?.message || 'Pointage refusé.',
            'Pointage refusé',
            { timeOut: 10000, closeButton: true }
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



  /**
   * Type et heure du pointage. `type` vient du serveur ; à défaut (serveur antérieur),
   * on retombe sur la règle historique « pas de départ ⇒ arrivée ».
   */
  private confirmation(data: PointageResultat | Pointage): ConfirmationPointage {
    const r = data as Partial<PointageResultat>;
    const type = r.type ?? (data.heureArrive && !data.heureDepart ? 'ENTREE' : 'SORTIE');
    return {
      type,
      heure: (type === 'ENTREE' ? data.heureArrive : data.heureDepart) ?? '',
      agenceNom: r.agenceNom ?? null,
      avertissement: r.avertissement ?? null,
    };
  }

  /** « Entrée enregistrée à 08:05 — SGS Mermoz » */
  private messageConfirmation(c: ConfirmationPointage): string {
    const libelle = c.type === 'ENTREE' ? 'Entrée' : 'Sortie';
    return `${libelle} enregistrée à ${c.heure}` + (c.agenceNom ? ` — ${c.agenceNom}` : '');
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
