import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import {} from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { AbsencesService } from '../../services/absences.service';
import { Absent } from '../../models/absent.model';

@Component({
  selector: 'app-absences',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    
// TODO: `HttpClientModule` should not be imported into a component directly.
// Please refactor the code to add `provideHttpClient()` call to the provider list in the
// application bootstrap logic and remove the `HttpClientModule` import from this component.
HttpClientModule
  ],
  templateUrl: './absences.component.html',
  styleUrl: './absences.component.scss'
})
export class AbsencesComponent implements OnInit {

  Absences$!: Observable<Absent[]>;
  Absences: Absent[] = [];
  searchText: string = '';
  sortDirection: boolean = true;
  toastMessage: string | null = null;
  toastTimeout: any;

  showModal = false;
  modalData: Absent = {
    codeSecret: '',
    nom: '',
    prenom: '',
    numero: '',
    dateAbsence:'',
    motif: '',
    justification: '',
    intervention: '',
    site: ''
  };
  selectedId: string | null = null;

  constructor(private absenceService: AbsencesService, private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadData();
    this.downloadData();
  }


  loadData() {
    this.absenceService.getAbsences().subscribe(data => {
      this.Absences = data;
    });
  }

  downloadData() {
    this.Absences$ = this.absenceService.getAbsences();
  }


  openEditModal(absent: Absent) {

    this.modalData = { ...absent };
    this.selectedId = absent.codeSecret;
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

    if (this.selectedId) {
      this.absenceService.updateAbsent(this.selectedId, this.modalData).subscribe(() => {
        this.loadData();
        this.closeModal();
        this.toastr.success('Employé mis à jour avec succès !', 'Succès');
      });
    }
  }

  get filteredAbsents() {
    const term = this.searchText.toLowerCase();
    return this.Absences.filter(absent =>
      `${absent.codeSecret} ${absent.prenom} ${absent.nom} ${absent.numero} ${absent.dateAbsence} ${absent.motif} ${absent.justification} ${absent.intervention} ${absent.site}`
        .toLowerCase()
        .includes(term)
    );
  }


  exportExcel() {
    this.Absences$.subscribe(data => {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employes');
      XLSX.writeFile(wb, 'Absents.xlsx');
    });
  }

  exportPdf() {
    this.Absences$.subscribe(data => {
      const doc = new jsPDF();
      autoTable(doc, {
        head: [['codeSecret', 'Nom', 'Prénom', 'Numéro', 'dateAbsence', 'motif', 'Justification', 'Site']],
        body: data.map(e => [
          String(e.codeSecret),
          String(e.nom),
          String(e.prenom),
          String(e.numero),
          String(e.dateAbsence),
          String(e.motif),
          String(e.justification),
          String(e.site)
        ])
      });
      doc.save('Absents.pdf');
    });
  }




}


