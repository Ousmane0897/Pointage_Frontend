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




@Component({
  selector: 'app-page-code-pin',
  standalone: true,
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
    this.getPointage();

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

 pointer() {
  const codeSecret = this.form.get('number')?.value;

  this.spinner.show(); // Show spinner immediately

  this.pointageService.pointer(codeSecret).subscribe({
    next: (data) => {
      this.pointage = data;

      // Wait 4 seconds before hiding spinner and navigating
      setTimeout(() => {
        this.spinner.hide(); // Hide spinner after 4 seconds

        if (this.pointage.heureArrive && !this.pointage.heureDepart) {
          this.router.navigateByUrl('/pagefinal1/' + this.pointage.codeSecret);
        } else if (this.pointage.heureArrive && this.pointage.heureDepart) {
          this.router.navigateByUrl('/pagefinal2/' + this.pointage.codeSecret);
        }
      }, 4000); // ⏱️ 4-second delay
    },
    error: (err) => {
      this.spinner.hide(); // hide spinner immediately on error
      console.log('ERROR', err);

      if (err.status === 429) {
        this.message = '⛔ Vous avez déjà pointé récemment avec ce téléphone.';
        this.toastr.error(this.message, 'Pointage refusé');
      } else {
        this.message = '❌ code employé invalide ou inexistant.';
        this.toastr.error(this.message, 'Erreur de pointage');
      }
    }
  });
}




  homePage() {
    this.router.navigateByUrl('/');
  }



}
