import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Superviseur } from '../../models/superviseur.model';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { SuperviseursService } from '../../services/superviseurs.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { CommonModule } from '@angular/common';
import { F } from '@angular/cdk/a11y-module.d-DBHGyKoh';

@Component({
  selector: 'app-superviseur',
  imports: [CommonModule, FormsModule],
  templateUrl: './superviseur.component.html',
  styleUrl: './superviseur.component.scss'
})
export class SuperviseurComponent {

  superviseurs: Superviseur[] = [];
  profil: string[] = ['MAGASINIER', 'SUPERVISEUR'];
  selectedSuperviseur: Superviseur | null = null;
  searchText: string = '';
  showModal = false;
  showPassword: boolean = false;
  confirmPassword: string = "";
  modalData: Superviseur = {
   
    prenom: '',
    nom: '',
    email: '',
    password: '',
    poste: '',
    role: '',
    motifDesactivation: '',
    active: true,

  }
  isEditMode = false;
  selectedId: string | undefined = undefined;

  constructor(private superviseurService: SuperviseursService,
    private dialog: MatDialog, private toastr: ToastrService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadData();
  }


  loadData() {
    this.superviseurService.getAllSuperviseurs().subscribe(data => {
      this.superviseurs = data;
    });
  }





  openAddModal() {
    this.isEditMode = false;
    this.modalData = { prenom: '', nom: '', email: '', password: '', poste: '', role: '', motifDesactivation: '', active: true };
    this.confirmPassword = "";
    this.selectedId = undefined;
    this.showModal = true;
  }

  openEditModal(superviseur: Superviseur) {
    this.isEditMode = true;
    this.modalData = { ...superviseur };
    this.confirmPassword = superviseur.password;
    this.selectedId = superviseur.id;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
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

    // Vérification de la correspondance des mots de passe
    if (this.modalData.password !== this.confirmPassword) {
      this.toastr.error('Les mots de passe ne correspondent pas.', 'Erreur');
      return;
    }

    if (this.isEditMode && this.selectedId) {
      this.superviseurService.updateSuperviseur(this.selectedId, this.modalData).subscribe(() => {
        this.loadData();
        this.closeModal();
        this.toastr.success('Superviseur mis à jour avec succès !', 'Succès');
      });
    } else {
      this.superviseurService.createSuperviseur(this.modalData).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
          this.toastr.success('Superviseur créé avec succès !', 'Succès');
        },
        error: (err) => {
          console.error('Erreur de création du superviseur :', err);
          this.toastr.error('Erreur lors de la création du superviseur', 'Erreur');
        }

      });
    }
  }

  get filteredSuperviseurs() {
    const term = this.searchText.toLowerCase();
    return this.superviseurs.filter(superviseur =>
      ` ${superviseur.prenom} ${superviseur.nom} ${superviseur.email} ${superviseur.password} ${superviseur.poste} ${superviseur.role} ${superviseur.motifDesactivation} ${superviseur.active}`
        .toLowerCase()
        .includes(term)
    );
  }
  toggleStatus(superviseur: Superviseur): void {
    const updated = { ...superviseur, active: !superviseur.active };
    this.superviseurService.updateSuperviseur(superviseur.id!, updated).subscribe({
      next: () => {
        this.toastr.success(`Superviseur ${updated.active ? 'activé' : 'désactivé'} avec succès !`, 'Succès');
        this.loadData();
      },
      error: (err) => {
        console.error('Erreur de mise à jour du statut :', err);
        this.toastr.error('Erreur lors de la mise à jour du statut du superviseur', 'Erreur');
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }



  deleteRow(identifiant: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: "Êtes-vous sûr de vouloir supprimer cet admin ?" },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.superviseurService.deleteSuperviseur(identifiant).subscribe({
          next: () => {
            this.loadData();
            this.toastr.success('Superviseur supprimé avec succès !', 'Succès');
          },
          error: (err) => {
            console.error('Erreur de suppression :', err);
            this.toastr.error('Erreur lors de la suppression du superviseur', 'Erreur');
          }
        });
      }
    });
  }

}
