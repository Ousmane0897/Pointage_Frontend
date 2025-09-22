import { Component, OnInit } from '@angular/core';
import { Agence } from '../../models/agences.model';
import { AgencesService } from '../../services/agences.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule, NgForm } from '@angular/forms';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { Employe } from '../../models/employe.model';

@Component({
  selector: 'app-agences', 
  standalone: true,      
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './agences.component.html',
  styleUrl: './agences.component.scss'
})
export class AgencesComponent implements OnInit {

  agences: Agence[] = [];
  showModal = false;
  isEditMode = false;
  searchText: string = '';

  modalData: Agence = {
    nom: '',
    adresse: '',
    joursOuverture: '',
    heuresTravail: '',
    nombreAgentsMaximum: 0,
    receptionEmploye: false,
    deplacementEmploye: false,
    deplacementInterne: false
  };
  selectedId: string | null = null;
  SelectedDepartment: string | null = null;
  showModal2 = false;
  employesByAgence: Employe[] = [];
  employeeDeplacee!: Employe;
  employeeRemplacee!: Employe;
  joursOuverture: string[] = ['Lundi-Vendredi', 'Lundi-Samedi'];
  heuresTravail: string[] = ['06:00-10:00','06:00-15:00','06:00-19:00','06:00-20:00'];
  nombreAgentsMaximum: number[] = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];



  constructor(private agencesService: AgencesService, private toastr: ToastrService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadData();
    this.getEmployeeDeplacee(this.modalData);
    this.getEmployeeRemplacee(this.modalData);
  }

  loadData() {
    this.agencesService.getAgences().subscribe(data => {
      this.agences = data;
    });
  }


  openAddModal() {
    this.isEditMode = false;
    this.modalData = { nom: '', adresse: '' , joursOuverture: '', heuresTravail: '', nombreAgentsMaximum: 0, receptionEmploye: false, deplacementEmploye: false, deplacementInterne: false };
    this.selectedId = null;
    this.showModal = true;
  }

  openEditModal(agence: Agence) {
    this.isEditMode = true;
    this.modalData = { ...agence };
    this.selectedId = agence.nom; // Assuming date is unique
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  closeModal2() {
    this.showModal2 = false;
  }
  

  getEmployeeDeplacee(modalData: Agence) {
    this.agencesService.getEmployeeDeplacee(modalData.nom).subscribe(data => {
      this.employeeDeplacee = data;
    });
  }

  getEmployeeRemplacee(modalData: Agence) {
    this.agencesService.getEmployeeRemplacee(modalData.nom).subscribe(data => {
      this.employeeRemplacee = data;
    });
  }

  saveModal(form: NgForm) {
    if (form.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.values(form.controls).forEach(control => {
        control.markAsTouched();
      });

      this.toastr.error('Veuillez remplir tous les champs obligatoires.', 'Erreur');
      return;
    }
    if (this.isEditMode && this.selectedId) {
      this.agencesService.updateAgence(this.selectedId, this.modalData).subscribe(() => {
        this.loadData();
        this.closeModal();
        this.toastr.success('Agence mis à jour avec succès !', 'Succès');
      });
    } else {

      this.agencesService.createAgence(this.modalData).subscribe(() => {
        this.loadData();
        this.closeModal();
        this.toastr.success('Agence ajoutée avec succès !', 'Succès');

      });
    }
  }

  get filteredAgences() {
    const term = this.searchText.toLowerCase();
    return this.agences.filter(agence =>
      `${agence.nom} ${agence.adresse}`
        .toLowerCase()
        .includes(term)
    );
  }

  deleteAgence(nom: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: "Êtes-vous sûr de vouloir supprimer cette agence ?" },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.agencesService.deleteAgence(nom).subscribe({
          next: () => {
            this.loadData();
            this.toastr.success('agence supprimé avec succès !', 'Succès');
          },
          error: (err) => {
            console.error('Erreur de suppression :', err);
            this.toastr.error('Erreur lors de la suppression du jour férié', 'Erreur');
          }
        });
      }
    });
  }

  viewEmployeesByAgence(nom: string) {
    this.SelectedDepartment = nom;
    this.agencesService.getEmployeesByAgence(nom).subscribe(data => {
      this.employesByAgence = data;
      this.showModal2 = true;
    }, error => {
      console.error('Erreur lors de la récupération des employés :', error);
      this.toastr.error('Erreur lors de la récupération des employés', 'Erreur');
    });
  }

  


}
