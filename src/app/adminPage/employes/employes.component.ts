import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EmployeService } from '../../services/employe.service';
import { Employe } from '../../models/employe.model';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { LoginService } from '../../services/login.service';
import { AgencesService } from '../../services/agences.service';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Agence } from '../../models/agences.model';
import { forkJoin } from 'rxjs';


@Component({
    selector: 'app-employes',
    imports: [
        FormsModule,
        CommonModule,
        NgxMatTimepickerModule,
        MatInputModule,
        MatFormFieldModule
    ],
    templateUrl: './employes.component.html',
    styleUrl: './employes.component.scss'
})
export class EmployesComponent implements OnInit {

  employes$!: Observable<Employe[]>;
  employes: Employe[] = [];
  searchText: string = '';
  sortDirection: boolean = true;
  toastMessage: string | null = null;
  toastTimeout: any;
  JoursDeTravail: string[] = ['Lundi-Vendredi', 'Lundi-Samedi'];
  statuts: string[] = ['Cheffe d\'équipe', 'Employé(e) simple', 'Autre']; // Liste des statuts disponibles
  selectedStatut: string = '';
  employeCreePar2!: string | null;
  agence!: Agence;
  agence2!: Agence;
  joursOuverture!: string;

  showModal = false;
  isEditMode = false;
  getNumberofEmployeesInOneAgence!: number;
  MaxNumberOfEmployeesInOneAgence!: number;
  getNumberofEmployeesInOneAgence2!: number;
  MaxNumberOfEmployeesInOneAgence2!: number;
  modalData: Employe = {
    codeSecret: '',
    nom: '',
    prenom: '',
    numero: '',
    intervention: '',
    statut: '',
    employeCreePar: '',
    deplacement: false,
    remplacement: false,
    site: [] as string[], // Assuming site is an array of strings
    joursDeTravail: '',
    joursDeTravail2: '',
    matin: false,
    apresMidi: false,
    heureDebut: '',
    heureFin: '',
    heureDebut2: '',
    heureFin2: '',
    dateEtHeureCreation: ''
  };
  selectedId: string | null = null;
  siteTouched: boolean = false;
  availableSites: string[] = []; // Liste des sites disponibles
  dropdownOpen = false;

  constructor(private employeService: EmployeService,
    private dialog: MatDialog, private toastr: ToastrService, private loginService: LoginService,
    private agenceService: AgencesService
  ) { }

  ngOnInit(): void {
    this.loadData();
    this.downloadData();
    this.employeCreePar2 = this.loginService.getFirstNameLastName();
    console.log('EmployeCreePar:', this.employeCreePar2);
    this.getAvailableSites();
  }


  loadData() {
    this.employeService.getEmployes().subscribe(data => {
      this.employes = data;
    });
  }

  downloadData() {
    this.employes$ = this.employeService.getEmployes();
  }

  getAvailableSites() {
    this.agenceService.getAllSites().subscribe(sites => {
      this.availableSites = sites;
    });
  }

  onFieldChange() {
    if (this.modalData.site.length === 1) this.myMethod(this.modalData.site[0]);
    else if (this.modalData.site.length === 2) this.myMethod2(this.modalData.site[1]);
  }

  myMethod(value: string) {
    this.agenceService.getJoursOuverture(value).subscribe(data => {
      return this.modalData.joursDeTravail = data;

    })
  }

  onFieldChange2(newValue: string) {
    this.myMethod(newValue); // call your method with the new value
  }

  myMethod2(value: string) {
    this.agenceService.getJoursOuverture(value).subscribe(data => {
      this.modalData.joursDeTravail2 = data;
    })
  }


  openAddModal() {
    console.log('Employé connecté (CreePar):', this.employeCreePar2);
    this.isEditMode = false;
    this.modalData = { codeSecret: '', nom: '', prenom: '', numero: '', intervention: '', statut: '', employeCreePar: this.employeCreePar2, deplacement: false, remplacement: false, site: [], joursDeTravail: '', joursDeTravail2: '', matin: false, apresMidi: false, heureDebut: '', heureFin: '', heureDebut2: '', heureFin2: '', dateEtHeureCreation: '' };
    this.selectedId = null;
    this.showModal = true;
  }

  openEditModal(employe: Employe) {
    this.isEditMode = true;
    this.modalData = { ...employe };
    this.selectedId = employe.codeSecret;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveModal(form: NgForm) {
    if (form.invalid) {
      Object.values(form.controls).forEach(control => control.markAsTouched());
      this.toastr.error('Veuillez remplir tous les champs obligatoires.', 'Erreur');
      return;
    }

    // --- Cas 2 agences ---
    if (this.modalData.site.length === 2) {
      forkJoin([
        this.agenceService.getAgenceByNom(this.modalData.site[0]),
        this.agenceService.getAgenceByNom(this.modalData.site[1])
      ]).subscribe(([agence1, agence2]) => {
        this.agence = agence1;
        this.agence2 = agence2;

        const h1 = agence1.heuresTravail.split('-')[0].trim();
        const h2 = agence1.heuresTravail.split('-')[1].trim();
        const h3 = agence2.heuresTravail.split('-')[0].trim();
        const h4 = agence2.heuresTravail.split('-')[1].trim();

        // Vérification : l'agent doit être inclus dans les horaires des deux agences
        if (
          this.compareHeures(h1, this.modalData.heureDebut) <= 0 &&
          this.compareHeures(this.modalData.heureFin, h2) <= 0 &&
          this.compareHeures(h3, this.modalData.heureDebut2 ?? '') <= 0 &&
          this.compareHeures(this.modalData.heureFin2 ?? '', h4) <= 0
        ) {
          this.isEditMode ? this.updateEmploye() : this.addEmploye();
        } else {
          this.toastr.error('Les horaires de l\'agent doivent être compris entre les horaires des agences !', 'Erreur');
        }
      });

      // --- Cas 1 agence ---
    } else if (this.modalData.site.length === 1) {
      this.agenceService.getAgenceByNom(this.modalData.site[0]).subscribe(agence1 => {
        this.agence = agence1;

        const h1 = agence1.heuresTravail.split('-')[0].trim();
        const h2 = agence1.heuresTravail.split('-')[1].trim();

        console.log('Heures de travail de l\'agence:', h1, '-', h2);
        console.log('Heures de travail de l\'agent:', this.modalData.heureDebut, '-', this.modalData.heureFin);

        // Vérification : l'agent doit être inclus dans les horaires de l'agence
        if (
          this.compareHeures(h1, this.modalData.heureDebut) <= 0 &&
          this.compareHeures(this.modalData.heureFin, h2) <= 0
        ) {
          this.isEditMode ? this.updateEmploye() : this.addEmploye();
        } else {
          this.toastr.error('Les horaires de l\'agent doivent être compris entre les horaires de l\'agence !', 'Erreur');
        }
      });
    }
  }


  // --- Méthodes pour éviter la duplication ---

  private addEmploye() {
    if (this.modalData.site.length === 1) {
      // === CAS 1 : Un seul site ===
      forkJoin({
        count: this.agenceService.getNumberofEmployeesInOneAgence(this.modalData.site[0]),
        max: this.agenceService.MaxNumberOfEmployeesInOneAgence(this.modalData.site[0])
      }).subscribe(({ count, max }) => {
        if (count < max) {
          this.modalData.heureDebutAvantDeplacement = this.modalData.heureDebut;
          this.modalData.heureFinAvantDeplacement = this.modalData.heureFin;
          this.employeService.addEmploye(this.modalData).subscribe(() => {
            this.loadData();
            this.closeModal();
            this.toastr.success('Employé ajouté avec succès !', 'Succès');
          });
        } else {
          this.toastr.error(
            `Le nombre maximum d'employés dans l'agence ${this.modalData.site[0]} a été atteint !`,
            'Erreur'
          );
        }
      });

    } else if (this.modalData.site.length === 2) {
      // === CAS 2 : Deux sites ===
      forkJoin({
        count1: this.agenceService.getNumberofEmployeesInOneAgence(this.modalData.site[0]),
        max1: this.agenceService.MaxNumberOfEmployeesInOneAgence(this.modalData.site[0]),
        count2: this.agenceService.getNumberofEmployeesInOneAgence(this.modalData.site[1]),
        max2: this.agenceService.MaxNumberOfEmployeesInOneAgence(this.modalData.site[1])
      }).subscribe(({ count1, max1, count2, max2 }) => {
        if (count1 >= max1) {
          this.toastr.error(
            `Le nombre maximum d'employés dans l'agence ${this.modalData.site[0]} a été atteint !`,
            'Erreur'
          );
          return;
        }

        if (count2 >= max2) {
          this.toastr.error(
            `Le nombre maximum d'employés dans l'agence ${this.modalData.site[1]} a été atteint !`,
            'Erreur'
          );
          return;
        }

        // si horaires fournis → flags matin/après-midi
        if (this.modalData.heureDebut) this.modalData.matin = true;
        if (this.modalData.heureDebut2) this.modalData.apresMidi = true;  
        this.modalData.heureDebutAvantDeplacement = this.modalData.heureDebut;
        this.modalData.heureFinAvantDeplacement = this.modalData.heureFin;
        this.modalData.heureDebutAvantDeplacement2 = this.modalData.heureDebut2;
        this.modalData.heureFinAvantDeplacement2 = this.modalData.heureFin2;
        this.employeService.addEmploye(this.modalData).subscribe(() => {
          this.loadData(); 
          this.closeModal();
          this.toastr.success('Employé ajouté avec succès !', 'Succès');
        });
      });
    }
  }


  private updateEmploye() {
    this.employeService.updateEmploye(this.selectedId!, this.modalData).subscribe(() => {
      this.loadData();
      this.closeModal();
      this.toastr.success('Employé mis à jour avec succès !', 'Succès');
    });
  }

  compareHeures(h1: string, h2: string): number {
    const [h1Hours, h1Minutes] = h1.split(':').map(Number);
    const [h2Hours, h2Minutes] = h2.split(':').map(Number);

    const totalMinutes1 = h1Hours * 60 + h1Minutes;
    const totalMinutes2 = h2Hours * 60 + h2Minutes;

    return totalMinutes1 - totalMinutes2;
  }


  get filteredEmployes() {
    const term = this.searchText.toLowerCase();
    return this.employes.filter(employe =>
      `${employe.codeSecret} ${employe.prenom} ${employe.nom} ${employe.numero} ${employe.intervention} ${employe.statut} ${employe.employeCreePar} ${employe.site}`
        .toLowerCase()
        .includes(term)
    );
  }

  deleteRow(codeSecret: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: "Êtes-vous sûr de vouloir supprimer cet employé ?" },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.employeService.deleteEmploye(codeSecret).subscribe({
          next: () => {
            this.loadData();
            this.toastr.success('Employé supprimé avec succès !', 'Succès');
          },
          error: (err) => {
            console.error('Erreur de suppression :', err);
            this.toastr.error('Erreur lors de la suppression de l\'employé', 'Erreur');
          }
        });
      }
    });
  }

  onCheckboxChange(event: any) {
    const value = event.target.value;
    const isChecked = event.target.checked;
    this.siteTouched = true;

    if (isChecked) {
      if (!this.modalData.site.includes(value)) {
        this.modalData.site.push(value);
        this.onFieldChange();
      }
    } else {
      this.modalData.site = this.modalData.site.filter(s => s !== value);
    }
  }



  exportExcel() {
    this.employes$.subscribe(data => {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employes');
      XLSX.writeFile(wb, 'employes.xlsx');
    });
  }

  exportPdf() {
    this.employes$.subscribe(data => {
      const doc = new jsPDF();
      autoTable(doc, {
        head: [['codeSecret', 'Nom', 'Prénom', 'Numéro', 'Intervention', 'Site']],
        body: data.map(e => [e.codeSecret, e.nom, e.prenom, e.numero, e.intervention, e.site])
      });
      doc.save('employes.pdf');
    });
  }





}
