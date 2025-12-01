import { Component, OnInit } from '@angular/core';
import { BesoinsService } from '../../../services/besoins.service';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { BesoinProduit, CollecteBesoins } from '../../../models/CollecteBesoins.model';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  ancienneDemande: CollecteBesoins | null = null; // Pour stocker la demande avant édition
  // Edition
  editForm!: FormGroup;
  editingDemandeId: string | null = null;
  showEditModal = false;
  prenomNom: string | null = null;
  role: string = "";
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
    this.role = this.loginService.getUserRole() || "";
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

  // 🟦 On garde une copie des valeurs d’origine
  this.ancienneDemande = d;

  // 🧹 Reset du FormArray
  this.produits.clear();

  // Champs modifiables (droite)
  this.editForm.patchValue({
    destination: d.destination,
    responsable: d.responsable
  });

  // Produits modifiables (droite)
  (d.produitsDemandes || []).forEach(p => this.ajouterProduitDefault(p));
}



  /**
   * ✅ 4. La logique appliquée à ton cas
Le code teste :

Existe-t-il au moins une demande telle que :

rôle = BACKOFFICE et nombreModifications = 1
OU rôle = SUPERADMIN et nombreModifications = 2

Si c’est le cas → some() renvoie true
--------------------
✅ 5. Pourquoi on fait ! (NOT)

Le getter renvoie :
return !this.demandes.some(...)
Donc on inverse le résultat de some() avec le NOT (!)
--------------------
Donc 2 cas :

✔ Si au moins une demande correspond aux conditions
some() → true
!true → false

➡ Le tableau doit s’afficher
➡ Le message NE doit PAS s’afficher

✔ Si aucune demande ne correspond

some() → false
!false → true

➡ On affiche : "Commandes de produits pas encore disponible"
   */

  get aucuneCommandeDisponible(): boolean { // get permet d’utiliser aucuneCommandeDisponible comme une propriété, pas comme une fonction.
    return !this.demandes.some(d => // some() vérifie si au moins un élément du tableau satisfait la condition. 
      (this.role === 'EXPLOITATION' && d.nombreModifications === 0) ||
      (this.role === 'BACKOFFICE' && d.nombreModifications === 1) ||
      (this.role === 'SUPERADMIN' && (d.nombreModifications === 2 || d.nombreModifications === 3)) ||
      (this.role === 'MAGASINIER' && (d.nombreModifications === 2 || d.nombreModifications === 3))
    );
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

  // Classe CSS conditionnelle pour les lignes du tableau
  getRowClass(d: any) {
    const role = this.role;
    const n = d.nombreModifications;

    const conditionVisible =
      (role === 'SUPERVISEUR' && n === 0) ||
      (role === 'EXPLOITATION' && n === 0) ||
      (role === 'BACKOFFICE' && n === 1) ||
      (role === 'MAGASINIER' && (n === 2 || n === 3)) ||
      (role === 'SUPERADMIN' && (n === 2 || n === 3));

    return {
      'opacity-40 pointer-events-none': !conditionVisible,   // ↓ ligne GRISÉE
      'bg-gray-100': !conditionVisible,       // ↓ couleur gris clair
      'hover:bg-gray-50': conditionVisible        // seulement si actif
    };
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
