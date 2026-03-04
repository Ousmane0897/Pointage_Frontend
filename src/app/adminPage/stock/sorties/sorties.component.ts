import { Component, DestroyRef, inject, OnInit } from '@angular/core';
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
import { LoginService } from '../../../services/login.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';



@Component({
  selector: 'app-sorties',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sorties.component.html',
  styleUrls: ['./sorties.component.scss']
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
  motifs = ['VENTE', 'INTERNE'];
  sousMotifs = ['AGENCE', 'DON', 'CASSE', 'CHANTIER', 'PEREMPTION', 'DEFECTUEUX'];
  alertesStock: { nomProduit: string; stock: number; seuil: number }[] = [];
  displayedMotifs: string[] = [];
  isInSubLevel = false; // Pour revenir au niveau principal
  animationClass = ''; // 🔹 transition Tailwind appliquée dynamiquement
  isResetting = false;
  showSubMotifs = false;
  closing = false;

  prenomNom: string | null = null;
  role: string | null = null;
  poste: string | null = null;

  private destroy$ = inject(DestroyRef); // Permet de gérer la durée de vie des abonnements et éviter les fuites de mémoire

   /*
     takeUntil(this.destroy$) : C’est un opérateur RxJS qui permet de gérer la durée de vie des abonnements. Quand le composant est détruit, on émet une valeur dans destroy$, ce qui fait que tous les abonnements qui utilisent takeUntil(this.destroy$) sont automatiquement désabonnés. 
      Avantages :
      - Tu n’as pas à te soucier de désabonner manuellement chaque abonnement, ce qui réduit les risques de fuites de mémoire.
      - Ton code est plus propre et plus facile à maintenir, car tu centralises la logique de nettoyage dans un seul endroit (ngOnDestroy).
      - C’est une bonne pratique recommandée dans Angular pour éviter les problèmes de performance liés aux abonnements non nettoyés.
      - En résumé, takeUntil(this.destroy$) est une technique efficace pour s’assurer que tous les abonnements sont correctement nettoyés lorsque le composant est détruit, ce qui améliore la performance et la stabilité de ton application Angular.
   */



  constructor(
    private fb: FormBuilder,
    private stockService: StockService,
    private produitService: ProduitService,
    private agencesService: AgencesService,
    private toastr: ToastrService,
    private loginService: LoginService
  ) { }

  ngOnInit(): void {

    // Initialisation du formulaire reactif 
    this.sortieForm = this.fb.group({
      produitsFormArray: this.fb.array([]),
      destination: [{ value: '', disabled: true }], // 🔒 désactivé par défaut et activé selon motif.
      responsable: [this.prenomNom ?? 'Diarra Niang', Validators.required],
      beneficaire: [''],
      motifSortieStock: ['', Validators.required],
      typeMouvement: ['SORTIE'],
      //dateMouvement: [new Date(), Validators.required],

    });

    // 🔹 Filtrage dynamique des produits selon le motif de sortie de stock. Pour les sorties en stock
    const ctrl = this.sortieForm.get('motifSortieStock'); // Récupère le contrôle du formulaire pour le motif de sortie de stock.
    if (ctrl) {
      ctrl.valueChanges.pipe(takeUntilDestroyed(this.destroy$)).subscribe(motif => { // À chaque changement de motif de sortie de stock. valueChanges pour écouter les changements de valeur
        this.produitService.getAllProduits().pipe(takeUntilDestroyed(this.destroy$)).subscribe(allProduits => {
          if (motif === 'VENTE') {
            this.produits = allProduits.filter(p => p.destination.includes('VENTE'));
          } else if (motif === 'DESTINATION_AGENCE') {
            this.produits = allProduits.filter(p => p.destination.includes('DESTINATION_AGENCE'));
          } else {
            this.produits = allProduits;
          }
        });
      });
    }

    // 🔹 Gestion dynamique du champ destination selon le motif
    // 👉 Donc, tu dis à Angular : “Chaque fois que la valeur de motifSortieStock change, exécute ce code.”
    // Quand l’utilisateur choisit une autre valeur dans le <select formControlName="motifSortieStock">, Angular met à jour le contrôle et déclenche l’observable valueChanges.
    // En clair :
    // ngOnInit() prépare la règle. On crée le form et on installe le listener.
    // valueChanges applique la règle chaque fois que l’utilisateur change la valeur.
    this.sortieForm.get('motifSortieStock')?.valueChanges.subscribe(value => { // A chaque changement de valeur du motif de sortie de stock valueChanges émet la nouvelle valeur sélectionnée par l’utilisateur et subdscribe exécute la fonction avec cette valeur.
      const destinationControl = this.sortieForm.get('destination');
      if (value === 'AGENCE') {
        destinationControl?.enable();
      } else {
        destinationControl?.disable();
      }
    });

    this.loadProduits();
    this.getAvailableAgences();
    this.ajouterProduit(); // commence avec 1 ligne

    this.displayedMotifs = [...this.motifs]; // Initialement, affiche les motifs principaux

    this.prenomNom = this.loginService.getFirstNameLastName();
    this.role = this.loginService.getUserRole();
    this.poste = this.loginService.getUserPoste();
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
    this.produitService.getProduits().pipe(takeUntilDestroyed(this.destroy$)).subscribe({
      next: (res) => (this.produits = res.content ?? res),
      error: () => this.toastr.error('Erreur lors du chargement des produits', 'Erreur'),
    });
  }

  // ===========================================
  // 🧩 Gestion du sélecteur de motif avec sous-niveaux
  // ===========================================
  // Affiche les sous-motifs ou revient au niveau principal

  onMotifChange(event: Event) {
    const selected = (event.target as HTMLSelectElement).value;

    if (selected === 'INTERNE') {
      this.showSubMotifs = true;
      this.sortieForm.patchValue({ motifSortieStock: '' });
    }
  }

  selectSousMotif(sm: string) {
  this.sortieForm.get('motifSortieStock')?.setValue(sm);
  this.showSubMotifs = false; // on ferme la fenêtre
}

  closeSubMotifs() {
    this.showSubMotifs = false;
    this.sortieForm.patchValue({ motifSortieStock: '' });
  }

  // ===========================================
  // 🧩 Gestion de l’affichage du champ bénéficiaire
  // ===========================================

  get isBeneficiaireVisible(): boolean {
  const sm = this.sortieForm.get('motifSortieStock')?.value;
  return sm === 'DON' || sm === 'CHANTIER';
}


  getAvailableAgences() {
    this.agencesService.getAllSites().pipe(takeUntilDestroyed(this.destroy$)).subscribe({
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
        this.stockService.getStockProduit(produit.codeProduit).pipe(takeUntilDestroyed(this.destroy$)).subscribe({
          next: (stock) => {
            this.stockDisponible[produit.codeProduit] = stock;

            // 🧭 Vérifier le seuil minimum
            if (produit.seuilMinimum !== null && stock <= produit.seuilMinimum) {
              this.ajouterAlerteStock(produit.nomProduit, stock, produit.seuilMinimum);
            } else {
              this.retirerAlerteStock(produit.nomProduit);
            }
          },
          error: () =>
            this.toastr.error('Erreur lors de la récupération du stock'),
        });
      }
    });

    // 🔹 Vérifie le stock disponible à chaque changement de quantité
    fg.get('quantite')?.valueChanges.pipe(debounceTime(300), takeUntilDestroyed(this.destroy$)).subscribe((val) => {
      const quantite = val ?? 0;
      const codeProduit = fg.get('codeProduit')?.value;

      if (codeProduit && this.stockDisponible[codeProduit] !== undefined) {
        if (quantite > this.stockDisponible[codeProduit]) {
          fg.get('quantite')?.setErrors({ exceedStock: true });
          this.toastr.error('Quantité demandée dépasse le stock disponible !');
        } else {
          fg.get('quantite')?.setErrors(null);
        }
      }
    });

    // 🔹 Empêche la sélection du même produit plusieurs fois
    // On s’abonne à valueChanges du champ nomProduit.Chaque fois que l’utilisateur change le produit sélectionné (dans un <select> par exemple), cette fonction s’exécute. La variable nomProduit contient la nouvelle valeur sélectionnée.
    fg.get('nomProduit')?.valueChanges.subscribe((nomProduit) => { // valueChanges écoute les changements du champ nomProduit.
      //On parcourt tous les autres groupes de formulaire (FormGroup) dans le FormArray, sauf le fg courant. On récupère la valeur de nomProduit de chacun. Résultat : un tableau autres qui contient tous les autres produits déjà sélectionnés.

      if (this.isResetting) return;  // 👈 Empêche le warning

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

  // ✅ Ajoute une alerte persistante
  ajouterAlerteStock(nomProduit: string, stock: number, seuil: number) {
    const existe = this.alertesStock.find((a) => a.nomProduit === nomProduit);
    if (!existe) {
      this.alertesStock.push({ nomProduit, stock, seuil });
    }
  }

  // ✅ Retire une alerte quand le stock redevient normal
  retirerAlerteStock(nomProduit: string) {
    this.alertesStock = this.alertesStock.filter((a) => a.nomProduit !== nomProduit);
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

    console.log("Responsable:", this.prenomNom);
    console.log("FORM STATUS:", this.sortieForm.status);
    console.log("FORM ERRORS:", this.sortieForm.errors);

    console.log("ARRAY STATUS:", this.produitsFormArray.status);
    console.log("ARRAY ERRORS:", this.produitsFormArray.errors);

    this.produitsFormArray.controls.forEach((ctrl, index) => {
      console.log("Ligne", index, "values:", ctrl.getRawValue());
      console.log("Ligne", index, "errors:", ctrl.errors);
    });

    if (this.sortieForm.invalid) {

      console.log(
        "Destination:", this.sortieForm.get("destination")?.value,
        " | Valid:", this.sortieForm.get("destination")?.valid
      );
      console.log(
        "Responsable:", this.sortieForm.get("responsable")?.value,
        " | Valid:", this.sortieForm.get("responsable")?.valid
      );
      console.log(
        "Bénéficiaire:", this.sortieForm.get("beneficaire")?.value,
        " | Valid:", this.sortieForm.get("beneficaire")?.valid
      );  
      console.log(
        "Motif:", this.sortieForm.get("motifSortieStock")?.value,
        " | Valid:", this.sortieForm.get("motifSortieStock")?.valid
      );
      console.log("MOTIF FINAL = ", this.sortieForm.get("motifSortieStock")?.value);

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
        responsable: this.prenomNom ?? 'Diarra Niang',
        beneficaire: formValue.beneficaire ?? null,
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

    // ✅ Seuls les champs de MouvementStock --> dto coté backend
    const mouvements = this.apercuProduits.map((a) => ({
      codeProduit: a.codeProduit,
      nomProduit: a.nomProduit,
      quantite: a.quantite,
    }));

    // 🔸 Appel au backend
    if (mouvements.length === 1) {
      this.stockService.creerSortieSimple({
        ...mouvements[0],
        typeMouvement: 'SORTIE',
        destination: this.sortieForm.value.destination,
        responsable: this.prenomNom ?? 'Diarra Niang  ',
        beneficaire: this.sortieForm.value.beneficaire ?? null,
        motifSortieStock: this.sortieForm.value.motifSortieStock,
        dateMouvement: this.sortieForm.value.dateMouvement
      }).pipe(takeUntilDestroyed(this.destroy$)).subscribe({
        next: () => this.onSuccess(),
        error: (err) => this.toastr.error(err.error.message),
      });
    } else {
      this.stockService.creerSortieBatch({
        mouvements, // tableau des produits à sortir du stock
        destination: this.sortieForm.value.destination,
        responsable: this.prenomNom ?? 'Diarra Niang',
        beneficaire: this.sortieForm.value.beneficaire ?? null,
        motifSortieStock: this.sortieForm.value.motifSortieStock,
        typeMouvement: 'SORTIE',
        dateMouvement: this.sortieForm.value.dateMouvement

      }).subscribe({
        next: () => this.onSuccess(),
        error: (err) => this.toastr.error(err.error.message),
      });
    }
  }


  // ===========================================
  // 🧩 Reset après succès
  // ===========================================
  onSuccess() {
    this.isResetting = true;

    this.toastr.success('Sortie enregistrée avec succès ✅');

    this.sortieForm.reset();
    this.produitsFormArray.clear();
    this.apercuProduits = [];
    this.stockDisponible = {};

    setTimeout(() => {
      this.isResetting = false;
    }, 50);
  }


}
