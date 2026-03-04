import { Component, OnInit } from '@angular/core';
import { Absent } from '../../models/absent.model';
import { Observable, Subject, takeUntil } from 'rxjs';
import { AbsencesService } from '../../services/absences.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-absences-temps-reel',
  imports: [CommonModule, FormsModule],
  templateUrl: './absences-temps-reel.component.html',
  styleUrl: './absences-temps-reel.component.scss'
})
export class AbsencesTempsReelComponent implements OnInit {


  Absences$!: Observable<Absent[]>;
  Absences: Absent[] = [];
  searchText: string = '';

  private destroy$ = new Subject<void>();



  constructor(private absenceService: AbsencesService, private toastr: ToastrService, private spinner: NgxSpinnerService
  ) { }

  ngOnInit(): void {
    this.loadData();
    this.downloadData();
  }


  // loadData() est utilisé pour charger les données dans le tableau et permettre la recherche en temps réel, tandis que downloadData() est utilisé pour fournir un flux de données à l'observable Absences$ qui peut être utilisé ailleurs dans le composant, par exemple pour afficher un compteur d'absences en temps réel ou pour d'autres fonctionnalités réactives.
  loadData() {
    this.spinner.show();
    this.absenceService.AbsenceTempsReel().pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.spinner.hide();
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackById(_: number, item: Absent): string {
    return item.codeSecret;
  }



}
