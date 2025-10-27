import { Component, OnDestroy, OnInit } from '@angular/core';
import { ProduitService } from '../../../services/produit.service';
import { Produit } from '../../../models/produit.model';
import {
  Subject,
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
  tap,
} from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { Activity, ArrowDownCircle, ArrowUpCircle, BarChart3, Package } from 'lucide-angular';


/**
 * Explication détaillée des méthodes et de la logique :
 * - ngOnInit : Initialise la recherche de produits
 * - loadProduits : Charge les produits en fonction des paramètres de pagination et de recherche
 * - onSearchChange : Gère les changements dans la barre de recherche
 * - nextPage / prevPage / goToPage : Gèrent la navigation entre les pages
 * - ngOnDestroy : Nettoie les abonnements pour éviter les fuites de mémoire
 * - SwitchMap : Annule les requêtes précédentes si une nouvelle est déclenchée
 * - DebounceTime : Attend 400ms après la dernière frappe avant de lancer la recherche
 * - DistinctUntilChanged : N'émet que si la valeur de recherche a changé
 * - CatchError : Gère les erreurs de requête et affiche un message d'erreur
 * - ToastrService : Affiche des notifications utilisateur pour les erreurs et succès
 * - Loading State : Indique à l'utilisateur que les données sont en cours de chargement
 * - Error Handling : Affiche un message d'erreur en cas de problème avec le backend
 * - Pagination : Permet de naviguer entre les pages de résultats
 * - Recherche : Permet de filtrer les produits en fonction d'une requête utilisateur
 * - Utilisation de Subject pour gérer les flux de données et les événements utilisateur
 * - Utilisation de takeUntil pour nettoyer les abonnements lors de la destruction du composant
 * pipe() : Chaîne d'opérateurs RxJS pour transformer et gérer les flux de données
 *      La méthode pipe() est le cœur du système RxJS utilisé en Angular.
 *      C’est grâce à pipe() que tu peux chaîner plusieurs opérateurs (map, tap, filter, switchMap, etc.) pour transformer ou contrôler le flux de données d’un Observable.
 *      pipe() permet de composer plusieurs opérateurs RxJS sur un Observable. Chaque opérateur agit sur les valeurs émises dans le temps par cet Observable.
 * debounceTime(ms) : Retarde l'émission des valeurs d'un Observable pendant une durée spécifiée (ms).
 *      debounceTime(ms) est un opérateur RxJS qui retarde l’émission d’une valeur d’un Observable pendant un certain délai (en millisecondes), et n’émet que la dernière valeur si aucune nouvelle n’arrive avant la fin du délai.
 *      il attend que l’utilisateur arrête de taper ou que le flux se stabilise pendant ms millisecondes avant de lancer l’action (la requête).
 *      Éviter les requêtes trop fréquentes ou les calculs inutiles pendant que l’utilisateur saisit du texte (comme une recherche live).
 * distinctUntilChanged():  est une étape clé pour éviter des requêtes inutiles ou des traitements redondants.
 *    distinctUntilChanged() est un opérateur RxJS qui permet de filtrer les émissions d’un Observable en n’émettant que les valeurs qui sont différentes de la précédente.
 *    Cela signifie que si la même valeur est émise plusieurs fois de suite, seule la première sera transmise aux abonnés.
 *    distinctUntilChanged() est un opérateur RxJS qui ignore les valeurs consécutives identiques émises par un Observable. Il n’émet une nouvelle valeur que si elle est différente de la précédente.
 * tap(): est un opérateur RxJS utilisé pour exécuter une action annexe (effet secondaire) à chaque émission d’un Observable, sans modifier les données qui circulent dans le flux.
 *    Utile pour des actions comme le logging, la mise à jour d’un état de chargement, ou toute autre opération qui ne doit pas affecter le flux de données principal.
 *    tap() te permet de faire quelque chose quand une valeur passe (log, loader, toast, mise à jour d’état, etc.),mais sans perturber le flux principal. C’est un opérateur d’effet secondaire.
 * switchMap(): est un opérateur RxJS qui permet de transformer les émissions d’un Observable en un nouvel Observable, tout en annulant les émissions précédentes si une nouvelle valeur arrive.
 *    switchMap() est un opérateur clé pour gérer des requêtes asynchrones dépendantes, comme les recherches ou les appels HTTP, et il se combine souvent avec debounceTime() et tap().
 *    switchMap() est un opérateur RxJS qui transforme chaque valeur émise par un Observable en un nouvel Observable et s’abonne automatiquement à ce nouvel Observable, en annulant l’abonnement précédent si une nouvelle valeur arrive avant que le flux précédent ne soit terminé.
 *    il permet de “switcher” vers un nouveau flux”, en annulant l’ancien, ce qui est parfait pour des recherches ou des requêtes qui peuvent être interrompues par de nouvelles entrées.
 *    switchMap = parfait pour les champs de recherche live, car on ne veut pas traiter les anciennes requêtes si l’utilisateur continue de taper.
 * takeUntil(notifier): est un opérateur RxJS qui permet de compléter un Observable lorsqu’un autre Observable (le “notifier”) émet une valeur.
 *    takeUntil() est souvent utilisé pour gérer le cycle de vie des abonnements dans les composants Angular, en s’assurant que les abonnements sont nettoyés lorsque le composant est détruit.
 *    takeUntil() est un opérateur RxJS qui permet de compléter un Observable lorsqu’un autre Observable émet une valeur. Il est souvent utilisé pour gérer le cycle de vie des abonnements, notamment pour éviter les fuites de mémoire en annulant les abonnements lorsque le composant est détruit.
 *    takeUntil() est un opérateur RxJS qui permet de compléter un Observable lorsque un autre Observable émet une valeur. C’est très utile pour gérer le cycle de vie des abonnements, par exemple pour se désabonner automatiquement lorsque le composant est détruit.
 * catchError(): est un opérateur RxJS qui permet de gérer les erreurs dans un flux d’Observables.
 *    catchError() intercepte les erreurs qui se produisent dans un Observable et permet de retourner un nouvel Observable ou de lancer une action spécifique en cas d’erreur.
 *    catchError() est un opérateur RxJS qui permet de capturer et de gérer les erreurs dans un flux d’Observables. Il te permet de définir une logique de gestion des erreurs, comme afficher un message à l’utilisateur ou retourner une valeur par défaut.
 * of(): est une fonction RxJS qui crée un Observable à partir d’une liste de valeurs ou d’un seul objet.
 *   of() est souvent utilisé pour retourner une valeur par défaut ou un Observable vide en cas d’erreur, notamment en combinaison avec catchError().
 */

@Component({
  selector: 'app-produit-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule

  ],
  templateUrl: './produit-list.component.html',
  styleUrls: ['./produit-list.component.scss']
})
export class ProduitListComponent implements OnInit, OnDestroy {


  produits: Produit[] = [];
  produit: Produit | null = null;
  total = 0;
  page = 0;
  size = 10;
  totalPages = 0;
  searchQuery = '';
  showModal = false;
  isEditMode = false;
  selectedProduit: Produit | null = null;
  selectedId: string | null = null;
  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  modalData: Produit = {
    nomProduit: '',
    codeProduit: '',
    description: '',
    categorie: '',
    destination: '',
    uniteDeMesure: '',
    conditionnement: '',
    prixDeVente: 0,
    emplacement: '',
    seuilMinimum: 0,
    statut: 'DISPONIBLE',
    quantiteSnapshot: 0

  }
  baseUrl: string = environment.apiUrlEmploye;


  // 🟢 Observables utilitaires
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // ⚙️ États UI
  loading = false;
  errorMessage = '';
  subCategories: any;
  produitSelectionne: any = null;
  StatusProduit: string[] = ['DISPONIBLE', 'RUPTURE', 'BLOQUE_POUR_CONTROLE_QUALITE'];
  availableDestinations: string[] = ['VENTE', 'AGENCE'];
  selectedCategory: string = '';
  availableCategories: string[] = ['Produits d’entretien général', 'Produits de nettoyage spécialisés', 'Équipements de protection individuelle (EPI)', 'Accessoires de nettoyage', 'Produits désinfectants', 'Produits pour sols et surfaces', 'Produits pour vitres et miroirs', 'Produits pour sanitaires', 'Produits pour cuisine', 'Produits écologiques', 'Autres'];
  showDetailsModal: boolean = false;
  selectedDestination: string = '';


  constructor(private produitService: ProduitService,
    private toastr: ToastrService, private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    // 🟡 Déclenchement de recherche debounced
    this.searchSubject
      .pipe(
        debounceTime(400), // 🕓 attend 400 ms après la dernière frappe
        distinctUntilChanged(), // n'émet que si la valeur a changé. Évite les recherches redondantes, ignore si même texte que précédemment
        tap(() => {
          this.loading = true;
          this.errorMessage = '';
          this.page = 0; // on revient à la première page lors d'une nouvelle recherche
        }),
        switchMap((query) => // query correspond à la valeur émise par ton searchSubject dans la méthode onSearchChange(), qui correspond à la valeur du champ de recherche
          // 🔄 switchMap annule les requêtes précédentes si une nouvelle arrive
          // Parfait pour les recherches live où l'utilisateur peut taper rapidement
          this.produitService.getProduits(this.page, this.size, query).pipe( // getProduits() va alors filtrer les produits côté backend en fonction du mot saisi.
            catchError((err) => {
              console.error('Erreur backend :', err);
              this.errorMessage = 'Erreur lors du chargement des produits.';
              this.toastr.error(this.errorMessage, 'Erreur');
              return of({ content: [], total: 0 });
            })
          )
        ),
        takeUntil(this.destroy$) // 👈 auto-désabonnement à la destruction
      )
      .subscribe((res) => {
        this.produits = res.content;
        this.total = res.total ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
        this.loading = false;
      });

    // 🔵 Chargement initial
    this.loadProduits();
  }
  openAddModal(): void {
    this.isEditMode = false;
    this.modalData = {
      nomProduit: '',
      codeProduit: '',
      description: '',
      categorie: '',
      destination: '',
      uniteDeMesure: '',
      conditionnement: '',
      prixDeVente: 0,
      emplacement: '',
      seuilMinimum: 0,
      statut: 'DISPONIBLE',
      quantiteSnapshot: 0
    };
    this.showModal = true;
    this.selectedId = null
  }

  loadProduitParCategorie(category: string): void {
    this.produitService.filtrerProduitsByCategory(category).subscribe({
      next: (response) => {
        this.produits = response.content;
      },
      error: (err) => console.error('Erreur backend :', err),
    });
  }

  openEditModal(produit: Produit) {
    this.isEditMode = true;
    this.modalData = { ...produit };
    this.selectedId = produit.codeProduit;
    this.showModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
  }

  deleteRow(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: "Êtes-vous sûr de vouloir supprimer ce produit ?" },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.produitService.deleteProduit(id).subscribe({
          next: () => {
            this.loadProduits();
            this.toastr.success('Produit supprimé avec succès !', 'Succès');
          },
          error: (err) => {
            console.error('Erreur de suppression :', err);
            this.toastr.error('Erreur lors de la suppression du produit', 'Erreur');
          }
        });
      }
    });
  }


  onCategoryChange(category: string): void {
    this.selectedCategory = category;

    // Recharge la liste
    this.loadProduitParCategorie(category);
  }


  onDestinationChange(destination: string): void {
    this.selectedDestination = destination;

    // Recharge la liste
    this.loadProduitParDestination(destination);
  }


  loadProduitParDestination(destination: string): void {
    this.produitService.filtrerProduitsByDestination(destination).subscribe({
      next: (response) => {
        this.produits = response.content;
      },
      error: (err) => console.error('Erreur backend :', err),
    });
  }

  loadProduits(): void {
    this.loading = true;
    this.errorMessage = '';
    this.produitService
      .getProduits(this.page, this.size, this.searchQuery)
      .pipe(
        catchError((err) => {
          console.error('Erreur backend :', err);

          if (err.status === 0) {
            // Cas typique : backend éteint ou inaccessible
            this.errorMessage = "Impossible de contacter le serveur. Vérifiez votre connexion.";
            this.toastr.error(this.errorMessage, 'Erreur');
          } else if (err.status === 400) {
            this.errorMessage = "Requête invalide. Vérifiez les paramètres envoyés.";
            this.toastr.error(this.errorMessage, 'Erreur');
          } else if (err.status === 401) {
            this.errorMessage = "Non autorisé. Veuillez vous reconnecter.";
            this.toastr.error(this.errorMessage, 'Erreur');
          } else if (err.status === 403) {
            this.errorMessage = "Accès refusé. Vous n’avez pas les droits nécessaires.";
            this.toastr.error(this.errorMessage, 'Erreur');
          } else if (err.status === 404) {
            this.errorMessage = "Mauvaise URL ou Endpoint inexistant.";
            this.toastr.error(this.errorMessage, 'Erreur');
          } else if (err.status === 500) {
            this.errorMessage = "Erreur interne du serveur. Veuillez réessayer plus tard.";
            this.toastr.error(this.errorMessage, 'Erreur');
          } else {
            this.errorMessage = `Erreur inattendue (${err.status}).`;
            this.toastr.error(this.errorMessage, 'Erreur');
          }

          return of({ content: [], total: 0 }); // Retourne un tableau vide en cas d'erreur. Un flux de secours (of({ content: [], total: 0 })) pour éviter un plantage dans .subscribe().
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        this.produits = res.content;
        this.total = res.total ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
        this.loading = false;
      });
  }

  // 🟢 Sélection de l’image
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];

      // 🖼️ Générer la prévisualisation
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  /** 🔍 Ouvrir modal de détails */
  ouvrirDetails(produit: Produit): void {
    this.produitSelectionne = produit;
    this.showDetailsModal = true;
  }
  fermerModal() {
    this.produitSelectionne = null;
  }




  saveModal(form: NgForm) {
    if (form.invalid) {
      Object.values(form.controls).forEach(control => control.markAsTouched());
      this.toastr.error('Veuillez remplir tous les champs obligatoires.', 'Erreur');
      return;
    }

    // Préparer les données du formulaire

    /*
        FormData est une classe JavaScript qui te permet de construire facilement un corps de requête multipart/form-data, 
        c’est-à-dire le format que le backend attend pour recevoir des fichiers et du texte dans la même requête.
        Utile pour envoyer des fichiers (images, documents) avec d’autres données (texte, JSON) dans une seule requête HTTP.
        Ici, on crée un FormData pour envoyer à la fois les données du produit (sous forme JSON) et le fichier image (si sélectionné).
        Le backend doit être configuré pour recevoir et traiter ce format multipart/form-data.
        Donc FormData contient les données du formulaire + fichier
      */
    console.log('Modal Data avant envoi :', this.modalData);
    const formData = new FormData();
    formData.append('produit', new Blob([JSON.stringify(this.modalData)], { type: 'application/json' }));
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    // --- 🧩 MODE ÉDITION ---
    if (this.isEditMode && this.selectedId) {
      this.produitService.updateProduit(this.selectedId, formData).subscribe({
        next: () => {
          this.loadProduits();
          this.closeModal();
          this.toastr.success('Produit mis à jour avec succès !', 'Succès');
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour :', err);
          this.toastr.error('Erreur lors de la mise à jour du produit.', 'Erreur');
        }
      });
      return; // On sort de la méthode après la mise à jour. Le reste du code gère uniquement la création.
    }

    // --- 🧩 MODE CRÉATION AVEC switchMap ---
    this.produitService
      .getProduitByCode(this.modalData.codeProduit)
      .pipe(
        switchMap(existingProduit => {
          if (existingProduit) {
            this.toastr.error('Un produit avec ce code existe déjà. Veuillez utiliser un code unique.', 'Erreur');
            // On retourne un observable vide pour stopper la chaîne
            return of(null);
          }
          // Aucun produit trouvé → on crée
          return this.produitService.createProduit(formData); // Ici, tu retournes l’Observable à switchMap. Cela permet à RxJS de s’abonner correctement à l’appel de création et de continuer la chaîne.
          // Le résultat de createProduit sera reçu dans le subscribe final. Sans return, switchMap ne reçoit rien → le subscribe ne sera jamais exécuté.Avec return, switchMap continue la chaîne normalement → workflow complet.
        }),
        catchError(err => {
          if (err.status === 404) {
            // Produit inexistant → on crée
            return this.produitService.createProduit(formData);
          }
          console.error('Erreur lors de la vérification du code produit :', err);
          this.toastr.error('Erreur de vérification du code produit.', 'Erreur');
          return of(null);
        })
      )
      .subscribe({
        next: (result) => {
          if (!result) return; // Arrêt si déjà existant ou erreur
          this.loadProduits();
          this.closeModal();
          this.toastr.success('Produit ajouté avec succès !', 'Succès');
          form.resetForm();
          this.previewUrl = null;
          this.selectedFile = null;
          console.log('FormData envoyé :', this.modalData);
        },
        error: (err) => {
          console.error('Erreur lors de la création du produit :', err);
          this.toastr.error('Erreur lors de la création du produit.', 'Erreur');
        }
      });
  }




  closeModal() {

    this.showModal = false;
  }

  /*
  next(value)
  Informe le flux qu’une nouvelle recherche est saisiee par l’utilisateur.
  Cela déclenche la chaîne d’opérateurs dans le pipe() du ngOnInit(), avec debounceTime, distinctUntilChanged, switchMap, etc.
  - searchQuery	Stocke la valeur du champ de recherche localement
  - searchSubject	Permet d’émettre la recherche vers un flux RxJS
  - next(value)	Informe le flux qu’une nouvelle recherche est saisie
  - pipe(...) (ailleurs)	Filtre, retarde, ou exécute la requête au bon moment
  */

  // 🔍 Appelé à chaque frappe dans barre de recherche
  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchSubject.next(value); // Ici, on émet la nouvelle valeur dans un Subject RxJS (souvent appelé searchSubject).
    //Cela permet d’émettre la recherche vers un flux RxJS, d’utiliser les opérateurs réactifs (comme debounceTime, distinctUntilChanged, switchMap, etc.) ailleurs dans le code — souvent dans le ngOnInit().
  }

  // ⏭️ Pagination suivante
  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.loadProduits();
    }
  }

  // ⏮️ Pagination précédente
  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadProduits();
    }
  }

  // 🔢 Aller à une page spécifique
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.page = page;
      this.loadProduits();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}


