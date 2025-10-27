import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { debounceTime } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import {
  MotifMouvementSortieStock,
  MouvementSortieStock,
  TypeMouvement,
} from '../../../models/MouvementSortieStock.model';
import { Produit } from '../../../models/produit.model';
import { StockService } from '../../../services/stock.service';
import { ProduitService } from '../../../services/produit.service';
import { AgencesService } from '../../../services/agences.service';

@Component({
  selector: 'app-sorties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sorties.component.html',
  styleUrls: ['./sorties.component.scss'],
})
export class SortiesComponent implements OnInit {
  // 🔹 Données du composant
  produits: Produit[] = [];
  agences: string[] = [];
  stockDisponible: { [codeProduit: string]: number } = {};
  sortieForm!: FormGroup;
  apercuProduits: any[] = []; // ✅ Aperçu avant validation

  // 🔹 Constantes métiers
  TypeMouvement: TypeMouvement = 'SORTIE';
  motifs: MotifMouvementSortieStock[] = [
    'VENTE',
    'DESTINATION_AGENCE',
    'DESTRUCTION',
    'DON',
    'CASSE',
    'CHANTIER',
    'AUTRE',
  ];

  constructor(
    private fb: FormBuilder,
    private stockService: StockService,
    private produitService: ProduitService,
    private agencesService: AgencesService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    
    // Initialisation du formulaire reactif 
    this.sortieForm = this.fb.group({
      produitsFormArray: this.fb.array([]),
      destination: ['', Validators.required],
      responsable: ['', Validators.required],
      motifSortieStock: ['', Validators.required],
      typeMouvement: ['SORTIE', Validators.required],
      dateSortie: [new Date(), Validators.required],

    });
    // 🔹 Gestion dynamique du champ destination selon le motif
    // 👉 Donc, tu dis à Angular : “Chaque fois que la valeur de motifSortieStock change, exécute ce code.”
    // Quand l’utilisateur choisit une autre valeur dans le <select formControlName="motifSortieStock">, Angular met à jour le contrôle et déclenche l’observable valueChanges.
    // En clair :
          // ngOnInit() prépare la règle. On crée le form et on installe le listener.
          // valueChanges applique la règle chaque fois que l’utilisateur change la valeur.
    this.sortieForm.get('motifSortieStock')?.valueChanges.subscribe(value => { // A chaque changement de valeur du motif de sortie de stock valueChanges émet la nouvelle valeur sélectionnée par l’utilisateur et subdscribe exécute la fonction avec cette valeur.
      const destinationControl = this.sortieForm.get('destination');
      if (value === 'DESTINATION_AGENCE') {
        destinationControl?.enable();
      } else {
        destinationControl?.disable();
      }
    });

    this.loadProduits();
    this.getAvailableAgences();
    this.ajouterProduit(); // commence avec 1 ligne
  }

  // ===========================================
  // 🧩 Getters
  // ===========================================
  get produitsFormArray(): FormArray {
    return this.sortieForm.get('produitsFormArray') as FormArray;
  }

  // ===========================================
  // 🧩 Chargement initial
  // ===========================================
  loadProduits() {
    this.produitService.getProduits().subscribe({
      next: (res) => (this.produits = res.content ?? res),
      error: () => this.toastr.error('Erreur lors du chargement des produits', 'Erreur'),
    });
  }

  getAvailableAgences() {
    this.agencesService.getAllSites().subscribe({
      next: (agences) => (this.agences = agences),
      error: () => this.toastr.error('Erreur lors du chargement des agences'),
    });
  }

  // ===========================================
  // 🧩 Gestion dynamique des lignes produits
  // ===========================================
  ajouterProduit() {
    const fg = this.fb.group({
      codeProduit: [{ value: '', disabled: true }, Validators.required], // 🔒 readonly
      nomProduit: ['', Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]],
    });

    // 🔹 Quand le produit (nom) change → renseigne automatiquement le codeProduit
    fg.get('nomProduit')?.valueChanges.subscribe((nomProduit) => {
      const produit = this.produits.find(p => p.nomProduit === nomProduit);
      if (produit) {
        fg.get('codeProduit')?.setValue(produit.codeProduit, { emitEvent: true });

        // Charger le stock disponible
        this.stockService.getStockProduit(produit.codeProduit).subscribe({
          next: (stock) => (this.stockDisponible[produit.codeProduit] = stock),
          error: () => this.toastr.error('Erreur lors de la récupération du stock'),
        });
      }
    });

    // 🔹 Vérifie le stock disponible à chaque changement de quantité
    fg.get('quantite')?.valueChanges.pipe(debounceTime(300)).subscribe((val) => {
      const quantite = val ?? 0;
      const codeProduit = fg.get('codeProduit')?.value;

      if (codeProduit && this.stockDisponible[codeProduit] !== undefined) {
        if (quantite > this.stockDisponible[codeProduit]) {
          fg.get('quantite')?.setErrors({ exceedStock: true });
          this.toastr.warning('Quantité demandée dépasse le stock disponible !');
        } else {
          fg.get('quantite')?.setErrors(null);
        }
      }
    });

    // 🔹 Empêche la sélection du même produit plusieurs fois
    // On s’abonne à valueChanges du champ nomProduit.Chaque fois que l’utilisateur change le produit sélectionné (dans un <select> par exemple), cette fonction s’exécute. La variable nomProduit contient la nouvelle valeur sélectionnée.
    fg.get('nomProduit')?.valueChanges.subscribe((nomProduit) => { // valueChanges écoute les changements du champ nomProduit.
      //On parcourt tous les autres groupes de formulaire (FormGroup) dans le FormArray, sauf le fg courant. On récupère la valeur de nomProduit de chacun. Résultat : un tableau autres qui contient tous les autres produits déjà sélectionnés.
      const autres = this.produitsFormArray.controls
        .filter((ctrl) => ctrl !== fg)
        .map((ctrl) => ctrl.get('nomProduit')?.value);
      // Si le nomProduit sélectionné est déjà dans le tableau autres, cela signifie que l’utilisateur a essayé de sélectionner un produit déjà choisi dans une autre ligne. Dans ce cas, on ajoute une erreur de validation au champ nomProduit du fg courant en utilisant setErrors. On affiche également un message d’avertissement à l’utilisateur via Toastr.
      if (autres.includes(nomProduit)) {
        fg.get('nomProduit')?.setErrors({ duplicate: true });
        this.toastr.warning('Ce produit est déjà sélectionné !');
      }
    });

    this.produitsFormArray.push(fg);
  }


  supprimerProduit(index: number) {
    const code = this.produitsFormArray.at(index).get('codeProduit')?.value;
    if (code) delete this.stockDisponible[code];
    this.produitsFormArray.removeAt(index);
  }

  // ===========================================
  // 🧩 Aperçu avant validation
  // ===========================================
  genererApercu() {
    if (this.sortieForm.invalid) {
      this.toastr.warning('Veuillez remplir tous les champs avant aperçu.');
      return;
    }

    const formValue = this.sortieForm.getRawValue(); // getRawValue() pour obtenir les valeurs même des champs désactivés (ici codeProduit)
    this.apercuProduits = formValue.produitsFormArray.map((p: any) => {
      const prod = this.produits.find((x) => x.codeProduit === p.codeProduit);
      return {
        nomProduit: prod ? prod.nomProduit : p.codeProduit,
        codeProduit: p.codeProduit,
        quantite: p.quantite,
        destination: formValue.destination ?? null,
        responsable: formValue.responsable,
        motif: formValue.motifSortieStock,

      };
    });
  }

  // ===========================================
  // 🧩 Validation finale (envoi backend)
  // ===========================================
  validerSortie() {
    if (!this.apercuProduits.length) {
      this.toastr.warning('Veuillez d’abord générer un aperçu.');
      return;
    }

    const mouvements: MouvementSortieStock[] = this.apercuProduits.map((a) => ({
      codeProduit: a.codeProduit,
      nomProduit: a.nomProduit,
      quantite: a.quantite,
      typeMouvement: 'SORTIE',
      destination: a.destination,
      motifSortieStock: a.motif,
      responsable: a.responsable,
      dateSortie: new Date(),
    }));

    // 🔸 Appel au backend
    if (mouvements.length === 1) {
      this.stockService.creerSortieSimple(mouvements[0]).subscribe({
        next: () => this.onSuccess(),
        error: (err) => this.toastr.error(err.error.message),
      });
    } else {
      this.stockService
        .creerSortieBatch({
          mouvements,
          destination: this.sortieForm.value.destination,
          responsable: this.sortieForm.value.responsable,
          motifSortieStock: this.sortieForm.value.motifSortieStock,
          typeMouvement: 'SORTIE',
          //dateSortie: new Date(),
        })
        .subscribe({
          next: () => this.onSuccess(),
          error: (err) => this.toastr.error(err.error.message),
        });
    }
  }

  // ===========================================
  // 🧩 Reset après succès
  // ===========================================
  onSuccess() {
    this.toastr.success('Sortie enregistrée avec succès ✅');
    this.sortieForm.reset();
    this.produitsFormArray.clear();
    this.apercuProduits = [];
    this.stockDisponible = {};
    this.ajouterProduit();
  }
}
