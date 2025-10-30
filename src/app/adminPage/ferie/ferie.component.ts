import { Component, OnInit } from '@angular/core';
import { Ferie } from '../../models/ferie.model';
import { FerieService } from '../../services/ferie.service';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import {} from '@angular/common/http';

@Component({
  selector: 'app-ferie',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    
// TODO: `HttpClientModule` should not be imported into a component directly.
// Please refactor the code to add `provideHttpClient()` call to the provider list in the
// application bootstrap logic and remove the `HttpClientModule` import from this component.
HttpClientModule
  ],
  templateUrl: './ferie.component.html',
  styleUrl: './ferie.component.scss'
})
export class FerieComponent implements OnInit {



  feries: Ferie[] = [];
  searchText: string = '';
  sortDirection: boolean = true;
  toastMessage: string | null = null;
  toastTimeout: any;

  showModal = false;
  isEditMode = false;
  modalData: Ferie = {
    date: '',
    nom: ''
  };
  selectedId: string | null = null;

  constructor(private ferie: FerieService,
    private dialog: MatDialog, private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadData();

  }


  loadData() {
    this.ferie.getFeries().subscribe(data => {
      this.feries = data;
    });
  }


  openAddModal() {
    this.isEditMode = false;
    this.modalData = { date: '', nom: '' };
    this.selectedId = null;
    this.showModal = true;
  }

  openEditModal(ferie: Ferie) {
    this.isEditMode = true;
    this.modalData = { ...ferie };
    this.selectedId = ferie.date; // Assuming date is unique
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
    if (this.isEditMode && this.selectedId) {
      this.ferie.updateFerie(this.selectedId, this.modalData).subscribe(() => {
        this.loadData();
        this.closeModal();
        this.toastr.success('Jour férié mis à jour avec succès !', 'Succès');
      });
    } else {
      this.ferie.postFerie(this.modalData).subscribe(() => {
        this.loadData();
        this.closeModal();
        this.toastr.success('Jour férié ajouté avec succès !', 'Succès');

      });
    }
  }

 
  deleteRow(date: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: "Êtes-vous sûr de vouloir supprimer le jour férié ?" },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ferie.deleteFerie(date).subscribe({
          next: () => {
            this.loadData();
            this.toastr.success('jour férié supprimé avec succès !', 'Succès');
          },
          error: (err) => {
            console.error('Erreur de suppression :', err);
            this.toastr.error('Erreur lors de la suppression du jour férié', 'Erreur');
          }
        });
      }
    });
  }



}
