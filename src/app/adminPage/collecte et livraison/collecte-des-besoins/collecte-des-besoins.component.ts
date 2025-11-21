import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BesoinsService } from '../../../services/besoins.service';
import { P } from '@angular/cdk/platform.d-B3vREl3q';
import { ProduitService } from '../../../services/produit.service';
import { Produit } from '../../../models/produit.model';
import { LoginService } from '../../../services/login.service';


@Component({
  selector: 'app-collecte-des-besoins',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './collecte-des-besoins.component.html',
  styleUrl: './collecte-des-besoins.component.scss'
})
export class CollecteDesBesoinsComponent {


  // ======================================
  // 🔹 État du composant
  // ======================================

  demandeId: string | null = null;
  Lesproduits: Produit[] = [];

  loading = false;

  form!: FormGroup;

  prenomNom: string | null = null;
  role: string | null = null;
  poste: string | null = null;
  moisNomComplet: string = '';

  


  // Différents statuts possibles
  statuts = ['EN_ATTENTE', 'EN_COURS', 'LIVRE'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private besoinsService: BesoinsService,
    private toastr: ToastrService,
    private produitsService: ProduitService,
    private loginService: LoginService
  ) { }

  ngOnInit(): void {
    this.buildForm();

    this.loadProduits();

    // Récupère les infos utilisateur
    this.prenomNom = this.loginService.getFirstNameLastName();
    this.role = this.loginService.getUserRole();
    this.poste = this.loginService.getUserPoste();

    // Récupère le mois en cours
    this.moisEnCours();
  }

  // ======================================
  // 🔄 Auto-remplissage du code produit
  // ======================================

  setupAutoCodeProduit(group: FormGroup) {
    group.get('nomProduit')?.valueChanges.subscribe((selectedProductName) => {
      if (selectedProductName) {
        const product = this.Lesproduits.find(p => p.nomProduit === selectedProductName);
        if (product) {
          group.patchValue({
            codeProduit: product.codeProduit
          }, { emitEvent: false });
        }
      }
    });
  }

  // ======================================
  // 📅 Récupération du mois en cours
  // ======================================

  moisEnCours() {
   this.moisNomComplet = new Date().toLocaleString('fr-FR', { month: 'long' }); // Nom complet du mois en cours
  }

  // ======================================
  // 📥 Charger la liste des produits
  // ======================================

  loadProduits() {
    this.produitsService.getAllProduits().subscribe({
      next: (data) => {
        this.Lesproduits = data;
      }
    });
  }

  // ======================================
  // 🧩 Construction du formulaire
  // ======================================
  buildForm() {
    this.form = this.fb.group({
      destination: ['', Validators.required],
      responsable: ['', Validators.required],
      statut: ['EN_ATTENTE'], // statut par défaut
      produitsDemandes: this.fb.array([]),
      historiqueModifications: this.fb.control([]),
      moisActuel:[this.moisNomComplet]
    });

    // Par défaut → une ligne produit
    this.addProduit();
  }

  // Getter propre
  get produits(): FormArray {
    return this.form.get('produitsDemandes') as FormArray; // Récupère le tableau des produits demandés
  }

  // ======================================
  // ➕ Ajout d’un produit
  // ======================================
  addProduit() {
    const fg = this.fb.group({
      codeProduit: [''],
      nomProduit: ['', Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]]
    });
    this.produits.push(fg);

    // Configure l’auto-remplissage du code produit
    this.setupAutoCodeProduit(fg);
  }

  // ======================================
  // ❌ Suppression d’un produit
  // ======================================
  removeProduit(i: number) {
    if (this.produits.length > 1) {
      this.produits.removeAt(i);
    }
  }


  // ======================================
  // 💾 Sauvegarder (create ou update)
  // ======================================
  save() {
    if (this.form.invalid) {
      this.toastr.warning("Veuillez remplir correctement les champs.");
      return;
    }

    const payload = this.form.value;

    // 🟦 MODE CREATE
    console.log('Creating with payload:', payload);
    this.besoinsService.createCollecteBesoins(payload, this.prenomNom! + ' (' + this.poste + ')').subscribe({
      next: () => {
        this.toastr.success("Demande créée avec succès !");
        this.resetForm();
      },
      error: () => this.toastr.error("Erreur lors de la création")
    });
  }

  // ======================================
  // 🔄 Changer le statut d’une demande
  // ======================================
  changerStatut(statut: string) {
    if (!this.demandeId) return;

    this.besoinsService.modifyStatutBesoins(this.demandeId, statut).subscribe({
      next: () => {
        this.form.patchValue({ statut });
        this.toastr.success(`Statut changé : ${statut}`);
      },
      error: () => this.toastr.error("Erreur changement statut")
    });
  }

  // ======================================
  // 🧽 Réinitialisation du formulaire complet
  // ======================================
  resetForm() {
    this.form.reset();
    this.produits.clear();
    this.addProduit();
    this.form.patchValue({
      statut: 'EN_ATTENTE'
    });
  }

}
