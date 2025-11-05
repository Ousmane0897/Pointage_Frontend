import { Component, OnInit } from '@angular/core';
import { Absent } from '../../models/absent.model';
import { Observable } from 'rxjs';
import { AbsencesService } from '../../services/absences.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-absences-temps-reel',
  imports: [CommonModule, FormsModule],
  templateUrl: './absences-temps-reel.component.html',
  styleUrl: './absences-temps-reel.component.scss'
})
export class AbsencesTempsReelComponent implements OnInit{


    Absences$!: Observable<Absent[]>;
    Absences: Absent[] = [];
    searchText: string = '';
   
   
  
    constructor(private absenceService: AbsencesService, private toastr: ToastrService
    ) { }
  
    ngOnInit(): void {
      this.loadData();
      this.downloadData();
    }
  
  
    loadData() {
      this.absenceService.AbsenceTempsReel().subscribe(data => {
        this.Absences = data;
      });
    }
  
    downloadData() {
      this.Absences$ = this.absenceService.AbsenceTempsReel();
    }

    get filteredAbsents() {
      const term = this.searchText.toLowerCase();
      return this.Absences.filter(absent =>
        `${absent.codeSecret} ${absent.prenom} ${absent.nom} ${absent.numero} ${absent.dateAbsence} ${absent.motif} ${absent.justification} ${absent.intervention} ${absent.site}`
          .toLowerCase()
          .includes(term)
      );
    }
  


}
