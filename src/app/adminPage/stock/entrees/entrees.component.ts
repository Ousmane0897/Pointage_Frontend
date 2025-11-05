import { Component, OnInit } from '@angular/core';
import { StockService } from '../../../services/stock.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { Produit } from '../../../models/produit.model';
import { ProduitService } from '../../../services/produit.service';
import { MouvementEntreeStock } from '../../../models/MouvementEntreeStock.model';

@Component({
    selector: 'app-entrees',
    imports: [CommonModule,
        FormsModule,
        MatInputModule,
        MatFormFieldModule,
        MatDatepickerModule,
        MatNativeDateModule
    ],
    templateUrl: './entrees.component.html',
    styleUrl: './entrees.component.scss'
})
export class EntreesComponent implements OnInit {

  entrees: MouvementEntreeStock[] = [];
  produits: Produit[] = [];
  motifs: string[] = ['RECEPTION_FOURNISSEUR', 'RETOUR_EN_STOCK', 'PRODUCTION_INTERNE', 'AJUSTEMENT_INVENTAIRE'];
  type: string[] = ['ENTREE', 'SORTIE', 'AJUSTEMENT'];
  selectedProduit: any = null;
  dateAujourdhui: Date = new Date();
  nouvelleEntree: MouvementEntreeStock = {
    codeProduit: '',
    nomProduit: '',
    type: 'ENTREE',
    quantite: 0,
    responsable: '',
    motifMouvement: 'RECEPTION_FOURNISSEUR',
    fournisseur: '',
    numeroFacture: '',
    dateDePeremption: new Date(),
    dateMouvement: new Date()

  }


  constructor(private stockService: StockService,
    private toastr: ToastrService,
    private produitService: ProduitService
  ) { }

  ngOnInit(): void {
    this.getProduits();
  }

  closeModal() {
    this.selectedProduit = null;
  }

  openModal(entree: MouvementEntreeStock) {
    this.selectedProduit = entree;
  }

  onProduitChange(nomProduit: string) {
    const selectedProduit = this.produits.find(p => p.nomProduit === nomProduit);
    if (selectedProduit) {
      this.nouvelleEntree.codeProduit = selectedProduit.codeProduit;
    }
  }


  getProduits() {
    this.produitService.getAllProduits().subscribe({
      next: (data) => {
        this.produits = data;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des produits', error);
        this.toastr.error('Erreur lors du chargement des produits', 'Erreur');
      }
    });
  }

  ajouterEntree() {

    const payload = {
      ...this.nouvelleEntree,
      dateMouvement: this.nouvelleEntree.dateMouvement?.toISOString(),
      dateDePeremption: this.nouvelleEntree.dateDePeremption?.toISOString()
    };

    this.stockService.ajouterEntree(payload).subscribe({
      next: (data) => {
        this.toastr.success('Entrée de stock ajoutée avec succès', 'Succès');
        this.nouvelleEntree = {
          codeProduit: '',
          nomProduit: '',
          type: 'ENTREE',
          quantite: 0,
          responsable: '',
          motifMouvement: 'RECEPTION_FOURNISSEUR',
          fournisseur: '',
          numeroFacture: '',
          dateDePeremption: new Date(),
          dateMouvement: new Date()
        };
        console.log(data);
      },
      error: (error) => {
        console.error('Erreur lors de l\'ajout de l\'entrée de stock', error);
        this.toastr.error('Erreur lors de l\'ajout de l\'entrée de stock', 'Erreur');
      }
    });
  }

}
