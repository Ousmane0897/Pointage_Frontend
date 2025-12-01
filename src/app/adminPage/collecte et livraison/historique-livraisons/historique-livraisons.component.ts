import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { LoginService } from '../../../services/login.service';
import { ToastrService } from 'ngx-toastr';
import { BesoinsService } from '../../../services/besoins.service';
import { CollecteBesoins } from '../../../models/CollecteBesoins.model';

@Component({
  selector: 'app-historique-livraisons',
  imports: [CommonModule],
  templateUrl: './historique-livraisons.component.html',
  styleUrl: './historique-livraisons.component.scss'
})
export class HistoriqueLivraisonsComponent implements OnInit {

  showHistoryModal = false;
  modificationHistory: string[] = [];
  role: string = "";
  demandes: CollecteBesoins[] = [];

  constructor(private besoinsService: BesoinsService, private toastr: ToastrService, private loginService: LoginService) { }

  ngOnInit(): void {
    this.role = this.loginService.getUserRole() || "";
  }

  chargerDemandes() {
    this.besoinsService.getHistoriqueLivraisons().subscribe({
      next: (data) => {
        this.demandes = data;
      },
      error: () => {
        this.toastr.error("Erreur lors du chargement des livraisons");
      }
    });
  }

  // Historique des modifications
  afficherHistorique(d: CollecteBesoins) {
    this.modificationHistory = []; // Réinitialiser l'historique avant de charger le nouveau

    this.besoinsService.getHistoriqueModifications(d.id!)
      .subscribe({
        next: (history) => {
          this.modificationHistory = history;
          this.showHistoryModal = true;
        },
        error: () => this.toastr.error("Erreur lors du chargement de l'historique")
      });
  }

}
