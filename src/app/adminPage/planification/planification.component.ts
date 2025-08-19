import { Component, OnInit } from '@angular/core';
import { Employe } from '../../models/employe.model';
import { EmployeService } from '../../services/employe.service';
import { ToastrService } from 'ngx-toastr';
import { Planification } from '../../models/planification.model';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { PlanificationService } from '../../services/planification.service';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { AgencesService } from '../../services/agences.service';

@Component({
  selector: 'app-planification',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgxMatTimepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' } // si tu veux en français
  ],
  templateUrl: './planification.component.html',
  styleUrls: ['./planification.component.scss']
})
export class PlanificationComponent implements OnInit {


  employes: Employe[] = [];
  planifications: Planification[] = [];
  planificationAVenir: Planification[] = [];
  planificationEnCours: Planification[] = [];
  planificationTerminee: Planification[] = [];
  searchText: string = '';
  availableSites: string[] = []; // Liste des sites disponibles
  employeCreePar: string | null = null;
  showModal = false;      // contrôle de l'affichage
  showModal2 = false;    // contrôle de l'affichage
  showModal3 = false;    // contrôle de l'affichage
  showModal4 = false;    // contrôle de l'affichage
  modalVisible = false;   // contrôle de l’animation
  isEditMode = false;
  selectedId: string | null = null;
  modalData: Planification = {
    prenomNom:'',
    codeSecret: '',
    nomSite: '',
    siteDestination:'',
    dateDebut: '',
    dateFin: '',
    heureDebut: '',
    heureFin: '',
    statut:'',
    commentaires: '',
    dateCreation: ''
  };




  constructor(private planification: PlanificationService,
    private toastr: ToastrService,
    private employeService: EmployeService, 
    private dialog: MatDialog,
    private planfication: PlanificationService,
    private agence: AgencesService
  ) { }

  ngOnInit(): void {
    this.loadData();
    this.getAvailableSites();
  }

  loadData() {
    this.planfication.getPlanifications().subscribe(data => {
      this.planifications = data;
      console.log('Employés:', this.employes);
    }, error => {
      this.toastr.error('Failed to load employes', 'Error');
      console.error('Error fetching employes:', error);
    });

  }

  /*loadPlanifications(codeSecret: string) {
    this.planification.getPlanificationById(codeSecret).subscribe(data => {
      this.planifications = data;
      console.log('Planifications:', this.planifications);
    }, error => {
      this.toastr.error('Failed to load planifications', 'Error');
      console.error('Error fetching planifications:', error);
    });
  }*/



  openEditModal(planification: Planification) {
    this.isEditMode = true;
    this.modalData = { ...planification }; // Clone the planification data to modalData
    this.selectedId = planification.codeSecret;
    this.showModal = true;
    setTimeout(() => {
      this.modalVisible = true;
    }, 10); // petit délai pour déclencher la transition
    this.showModal2 = false; // Ferme le modal précédent s'il est ouvert


  }
  
  getAvailableSites() {
    this.agence.getAllSites().subscribe(sites => {
      this.availableSites = sites;
    });
  }
  /*openAddModal() {
    this.isEditMode = false;
    this.modalData = { nomPrenom:'',codeSecret: '', nomSite: '', siteDestination:'', dateDebut: '', dateFin: '', heureDebut: '', heureFin: '', statut:'', commentaires: null,  dateCreation: '' };
    this.selectedId = null;
    this.showModal = true;
    setTimeout(() => {
      this.modalVisible = true;
    }, 10); // petit délai pour déclencher la transition
  }*/


  closeModal() {
    this.modalVisible = false; // déclenche la sortie (opacity-0)
    setTimeout(() => {
      this.showModal = false; // enlève du DOM ou cache via [hidden]
    }, 300); // durée de la transition CSS en ms
  }  

  closeModal2() {
    this.showModal2 = !this.showModal2;
  } 

  closeModal3() {
    this.showModal3 = !this.showModal3;
  }

  closeModal4() {
    this.showModal4 = !this.showModal4;
  }




  get filteredEmployes() {
    const term = this.searchText.toLowerCase();
    return this.employes.filter(employe =>
      `${employe.codeSecret} ${employe.prenom} ${employe.nom} ${employe.numero} ${employe.intervention} ${employe.statut} ${employe.employeCreePar} ${employe.site}`
        .toLowerCase()
        .includes(term)
    );
  }

  convertirVersISO(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toISOString(); // ex: "2025-12-31T00:00:00.000Z"
  }

  saveModal() {

    if (this.isEditMode && this.selectedId) {
      const dateDebutStr = this.modalData.dateDebut; // format ISO venant de la base
      const dateDebut = new Date(dateDebutStr);
      const aujourdHui = new Date();

      // Pour éviter les erreurs liées à l'heure (surtout en UTC vs local), on remet les deux dates à minuit
      dateDebut.setUTCHours(0, 0, 0, 0);
      aujourdHui.setHours(0, 0, 0, 0); // ici on utilise locale pour la date du jour

      const diffTime = dateDebut.getTime() - aujourdHui.getTime();
      const diffJours = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      console.log(`Il reste ${diffJours} jour(s)`);
      if (diffJours > 7) {
         
        this.planification.updatePlanification(this.selectedId, this.modalData).subscribe(() => {
          this.closeModal2();
          this.toastr.success('Planning mis à jour avec succès!', 'Succès');
        });
      }
      else {
        this.toastr.error('La date de début doit être supérieure à 7 jours à partir d’aujourd’hui pour pouvoir modifier.', 'Erreur');
      }
    } else {
      
      
      this.toastr.error('Erreur survenue pendant la mise à jour', 'Erreur')
    }
  }

  deleteplanification(codeSecret: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: "Êtes-vous sûr de vouloir supprimer ce planning ?" },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.planification.deletePlanification(codeSecret).subscribe({
          next: () => {

            this.toastr.success('Planning supprimé avec succès !', 'Succès');
          },
          error: (err) => {
            console.error('Erreur de suppression :', err);
            this.toastr.error('Erreur lors de la suppression du planning', 'Erreur');
          }
        });
      }
    });
  }

  GetplanificationAVenir(codeSecret: string) {

    this.planification.getPlanificationsAVenir(codeSecret).subscribe(data => {
      this.planificationAVenir = data;
      console.log('DateDebut:', this.planificationAVenir.map(p => p.dateDebut));
      console.log('DateFin:', this.planificationAVenir.map(p => p.dateFin));
      this.showModal2 = true;
      console.log('Planifications à venir:', this.planificationAVenir);
    }, error => {
      this.toastr.error('Failed to load upcoming planifications', 'Error');
      console.error('Error fetching upcoming planifications:', error);
    });
  }

  GetplanificationEnCours(codeSecret: string) {
    this.planification.getPlanificationsEnCours(codeSecret).subscribe(data => {
      this.planificationEnCours = data;
      this.showModal3 = true;
      console.log('Planifications en cours:', this.planificationEnCours);
    }, error => {
      this.toastr.error('Failed to load ongoing planifications', 'Error');
      console.error('Error fetching ongoing planifications:', error);
    });
  }

  GetplanificationTerminee(codeSecret: string) {
    this.planification.getPlanificationsTerminees(codeSecret).subscribe(data => {
      this.planificationTerminee = data;
      this.showModal4 = true;
      console.log('Planifications terminées:', this.planificationTerminee);
    }, error => {
      this.toastr.error('Failed to load completed planifications', 'Error');
      console.error('Error fetching completed planifications:', error);
    });
  }

  formatDateToDDMMYYYY(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR'); // change "Sat Aug 10 2025 00:00:00 GMT+0000"  → "10/08/2025"
  }

  convertToJsDate(dateString: string): string {
    const [day, month, year] = dateString.split('/');
    const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
    return date.toString(); // change "10/08/2025" -> "Sat Aug 10 2025 00:00:00 GMT+0000"
  }

  isoToDdMmYyyy(isoDateStr: string): string {
  const date = new Date(isoDateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

 jsDateToIso(date: Date): string {
  return date.toISOString();
}











}
