import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AbsencesService } from '../../services/absences.service';
import { ToastrService } from 'ngx-toastr';
import { Absent } from '../../models/absent.model';
import { Observable, Subject, takeUntil } from 'rxjs';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-absences-historique',
  imports: [CommonModule, FormsModule],
  templateUrl: './absences-historique.component.html',
  styleUrl: './absences-historique.component.scss'
})
export class AbsencesHistoriqueComponent {

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

     private destroy$ = new Subject<void>();

    
  
    constructor(private absenceService: AbsencesService, private toastr: ToastrService
    ) { }
  
    ngOnInit(): void {
      this.loadData();
      this.downloadData();
    }
  
  
    loadData() {
      this.absenceService.AbsenceHistorique().pipe(takeUntil(this.destroy$)).subscribe(data => {
        this.Absences = data;
      });
    }
  
    downloadData() {
      this.Absences$ = this.absenceService.AbsenceHistorique();
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
  
    onDestroy() {
      this.destroy$.next();
      this.destroy$.complete();
    }
  

}
