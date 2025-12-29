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
  employeCreePar2!: string | null;
 

  constructor(private employeService: EmployeService,
    private loginService: LoginService
  ) { }

  ngOnInit(): void {
    this.loadData();
    this.downloadData();
    this.employeCreePar2 = this.loginService.getFirstNameLastName();
    console.log('EmployeCreePar:', this.employeCreePar2);
    
  }


  loadData() {
    this.employeService.getEmployes().subscribe(data => {
      this.employes = data;
    });
  }

  downloadData() {
    this.employes$ = this.employeService.getEmployes();
  }

  

  get filteredEmployes() {
    const term = this.searchText.toLowerCase();
    return this.employes.filter(employe =>
      `${employe.codeSecret} ${employe.agentId} ${employe.prenom} ${employe.nom} ${employe.numero} ${employe.intervention} ${employe.statut} ${employe.employeCreePar} ${employe.site}`
        .toLowerCase()
        .includes(term)
    );
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
