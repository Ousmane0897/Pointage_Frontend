import { Component, OnInit } from '@angular/core';
import { PointageService } from '../../services/pointage.service';
import { Pointage } from '../../models/pointage.model';
import { Observable } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pointages',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

  ],
  templateUrl: './pointages.component.html',
  styleUrl: './pointages.component.scss'
})
export class PointagesComponent implements OnInit {

  // Déclaration des variables
  pointages$!: Observable<Pointage[]>;
  pointages: Pointage[] = [];
  searchText: string = '';
  sortDirection: boolean = true;
  toastMessage: string | null = null;
  toastTimeout: any;

  constructor(private pointageService: PointageService) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.pointages$ = this.pointageService.getPointages();
    this.pointages$.subscribe(data => {
      this.pointages = data;
    });
  }
  
   get filteredPointages() {
    const term = this.searchText.toLowerCase();
    return this.pointages.filter(pointage =>
      `${pointage.codeSecret} ${pointage.prenom} ${pointage.nom} ${pointage.date} 
      ${pointage.heureArrive} ${pointage.heureDepart} ${pointage.duree} ${pointage.status} ${pointage.site}`
        .toLowerCase()
        .includes(term)
    );
  }

   exportExcel() {
      this.pointages$.subscribe(data => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pointages');
        XLSX.writeFile(wb, 'pointages.xlsx');
      });
    }
  
    exportPdf() {
      this.pointages$.subscribe(data => {
        const doc = new jsPDF();
        autoTable(doc, {
          head: [['codeSecret', 'Prénom', 'Nom', 'Date', 'Heure arrivée', 'Heure départ', 'Durée', 'Status', 'Site']],
          body: data.map(p => [p.codeSecret,p.prenom, p.nom, p.date, p.heureArrive, p.heureDepart, p.duree, p.status, p.site])
        });
        doc.save('pointages.pdf');
      });
    }
  

}
