import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EmployeService } from '../../services/employe.service';
import { Employe } from '../../models/employe.model';
import { Observable } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-employes',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    HttpClientModule 
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

  showModal = false;
  isEditMode = false;
  modalData: Employe = {
    codeSecret: '',
    nom: '',
    prenom: '',
    numero: '',
    intervention: '',
    site: ''
  };
  selectedId: string | null = null;

  constructor(private employeService: EmployeService,
    private dialog: MatDialog, private toastr: ToastrService
  ) {}

 ngOnInit(): void {
    this.loadData();
    this.downloadData();
  }
 

  loadData() {
   this.employeService.getEmployes().subscribe(data => {
      this.employes = data;
      });
  }

  downloadData() {
    this.employes$ = this.employeService.getEmployes();
  }


  openAddModal() {
    this.isEditMode = false;
    this.modalData = { codeSecret: '', nom: '', prenom: '', numero: '', intervention: '', site: '' };
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
    // Marquer tous les champs comme touchés pour afficher les erreurs
    Object.values(form.controls).forEach(control => {
      control.markAsTouched();
    });

    this.toastr.error('Veuillez remplir tous les champs obligatoires.', 'Erreur');
    return;
  }

  if (this.isEditMode && this.selectedId) {
    this.employeService.updateEmploye(this.selectedId, this.modalData).subscribe(() => {
      this.loadData();
      this.closeModal();
      this.toastr.success('Employé mis à jour avec succès !', 'Succès');
    });
  } else {
    this.employeService.addEmploye(this.modalData).subscribe(() => {
      this.loadData();
      this.closeModal();
      this.toastr.success('Employé ajouté avec succès !', 'Succès');
    });
  }
}


   get filteredEmployes() {
    const term = this.searchText.toLowerCase();
    return this.employes.filter(employe =>
      `${employe.codeSecret} ${employe.prenom} ${employe.nom} ${employe.numero} ${employe.intervention} ${employe.site}`
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
        body: data.map(e => [e.codeSecret,e.nom, e.prenom, e.numero, e.intervention, e.site])
      });
      doc.save('employes.pdf');
    });
  }



}
