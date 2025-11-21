import { Component, OnInit } from '@angular/core';
import { BesoinsService } from '../../../services/besoins.service';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { BesoinProduit, CollecteBesoins } from '../../../models/CollecteBesoins.model';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { R } from '@angular/cdk/overlay.d-BdoMy0hX';
import { LoginService } from '../../../services/login.service';


@Component({
  selector: 'app-suivi-commandes',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './suivi-commandes.component.html',
  styleUrl: './suivi-commandes.component.scss'
})
export class SuiviCommandesComponent implements OnInit {


  demandes: CollecteBesoins[] = [];
  loading = false;

  // Edition
  editForm!: FormGroup;
  editingDemandeId: string | null = null;
  showEditModal = false;
  prenomNom: string | null = null;
  role: string | null = null;
  poste: string | null = null;
  modificationHistory: string[] = [];
  showHistoryModal = false;
  moisNomComplet: string = '';

  constructor(private besoinsService: BesoinsService, private toastr: ToastrService,
    private fb: FormBuilder, private loginService: LoginService) { }

  ngOnInit() {

    this.initForm(); // Initialise le formulaire d’édition
    this.chargerDemandes(); // Charge les demandes existantes


    this.prenomNom = this.loginService.getFirstNameLastName();
    this.role = this.loginService.getUserRole();
    this.poste = this.loginService.getUserPoste();
    
    this.moisEnCours();
  }

  // ======================================
  // 📅 Récupération du mois en cours
  // ======================================

  moisEnCours() {
   this.moisNomComplet = new Date().toLocaleString('fr-FR', { month: 'long' }); // Nom complet du mois en cours
  }

  chargerDemandes() {
    this.loading = true;
    this.besoinsService.getBesoinsByMoisActuel().subscribe({
      next: res => { this.demandes = res; this.loading = false; },
      error: () => { this.loading = false; this.toastr.error('Impossible de charger'); }
    });
  }

  initForm() { // sert à créer et initialiser le formulaire d’édition.
    this.editForm = this.fb.group({
      destination: ['', Validators.required],
      responsable: ['', Validators.required],
      produitsDemandes: this.fb.array([])
    });
  }

  // Accesseurs pour le FormArray des produits.Permet de manipuler plus facilement les produits dans le formulaire.
  get produits(): FormArray { return this.editForm.get('produitsDemandes') as FormArray; } // retourne le FormArray des produitsDemandes.

  ajouterProduitDefault(item?: BesoinProduit) {
    this.produits.push(this.fb.group({
      codeProduit: [item?.codeProduit ?? ''],
      nomProduit: [item?.nomProduit ?? '', Validators.required],
      quantite: [item?.quantite ?? 1, [Validators.required, Validators.min(1)]]
    }));
  }

  supprimerProduit(i: number) { this.produits.removeAt(i); }

  ouvrirEdition(d: CollecteBesoins) {
    this.editingDemandeId = d.id!;
    this.showEditModal = true;

    // On nettoie correctement le FormArray
    this.produits.clear();

    // On remplit les champs simples
    this.editForm.patchValue({
      destination: d.destination,
      responsable: d.responsable
    });

    // On ajoute les produits du backend
    (d.produitsDemandes || []).forEach(p => this.ajouterProduitDefault(p));
  }


  fermerModal() { this.showEditModal = false; this.editingDemandeId = null; }

  // Sauvegarde de l’édition
  sauvegarderEdition(): void {
    if (this.editForm.invalid || !this.editingDemandeId) {
      this.toastr.warning('Formulaire invalide');
      return; // return vide OK
    }

    const payload: CollecteBesoins = this.editForm.value;

    this.besoinsService.modifyCollecteBesoins(this.editingDemandeId, payload, this.prenomNom! + ' (' + this.poste + ')')
      .subscribe({
        next: () => {
          this.toastr.success('Demande modifiée');
          this.fermerModal();
          this.chargerDemandes();
        },
        error: err => this.toastr.error(err?.error?.message || 'Erreur modification')
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

  // Actions statut
  mettreEnCours(d: CollecteBesoins) {
    this.besoinsService.modifyStatutBesoins(d.id!, 'EN_COURS', this.prenomNom! + ' (' + this.poste + ')').subscribe({
      next: () => { this.toastr.success('Commande en cours'); this.chargerDemandes(); },
      error: () => this.toastr.error('Erreur statut')
    });
  }

  marquerLivree(d: CollecteBesoins) {
    this.besoinsService.modifyStatutBesoins(d.id!, 'LIVREE', this.prenomNom! + ' (' + this.poste + ')').subscribe({
      next: () => { this.toastr.success('Commande livrée'); this.chargerDemandes(); },
      error: err => this.toastr.error(err?.error?.message || 'Erreur lors de la livraison')
    });
  }

}
