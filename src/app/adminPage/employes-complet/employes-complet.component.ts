import { Component, OnDestroy, OnInit } from '@angular/core';
import { EmployeComplet } from '../../models/employe-complet.model';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { EmployeCompletService } from '../../services/employe-complet.service';
import { N, R } from '@angular/cdk/overlay.d-BdoMy0hX';
import { ToastrService } from 'ngx-toastr';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, finalize, forkJoin, of, Subject, switchMap, takeUntil, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { F } from '@angular/cdk/a11y-module.d-DBHGyKoh';
import * as XLSX from 'xlsx';
import { FormsModule, NgForm } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { AgencesService } from '../../services/agences.service';

@Component({
  selector: 'app-employes-complet',
  imports: [CommonModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule],
  templateUrl: './employes-complet.component.html',
  styleUrl: './employes-complet.component.scss'
})
export class EmployesCompletComponent implements OnInit, OnDestroy {

  employeComplet: EmployeComplet[] = [];

  dateAujourdhui: Date = new Date();
  total = 0;
  page = 0;
  size = 10;
  totalPages = 0;
  searchQuery = '';
  showModal = false;
  isEditMode = false;
  selectedEmploye: EmployeComplet | null = null;
  selectedId: string | null = null;
  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  isLoading = false;
  preview: EmployeComplet[] = [];

  // ⚙️ États UI
  loading = false;
  errorMessage = '';
  subCategories: any;
  employeCompletSelectionne: EmployeComplet | null = null;
  dropdownOpen = false;
  availableSites: string[] = []; // Liste des agences disponibles
  siteTouched: boolean = false;

  // 🟢 Observables utilitaires
  private destroy$ = new Subject<void>(); // Pour gérer le cycle de vie des abonnements
  private searchSubject = new Subject<string>(); // Pour la recherche avec debounce 


  modalData: EmployeComplet = {

    agentId: '',
    matricule: '',
    prenom: '',
    nom: '',
    sexe: '',
    heureDebut: '',
    heureFin: '',
    joursDeTravail: '',
    joursDeTravail2: '',
    dateNaissance: new Date(),
    lieuNaissance: '',
    nationalite: '',
    etatCivil: '',
    adresse: '',
    ville: '',
    telephone1: '',
    telephone2: '',
    email: '',
    contactUrgence: '',
    lienDeParenteAvecContactUrgence: '',
    telephoneUrgent: '',
    agence: [] as string[],
    codeSite: '',
    villeSite: '',
    chefEquipe: '',
    managerOps: '',
    codeSite2: '',
    villeSite2: '',
    chefEquipe2: '',
    managerOps2: '',
    poste: '',
    typeContrat: '',
    dateEmbauche: null,
    dateFinContrat: null,
    tempsDeTravail: '',
    horaire: '',
    salaireDeBase: '',
    primeTransport: '',
    primeAssiduite: '',
    primeRisque: '',
    ribCompteBancaire: '',
    banque: '',
    cnssOuIpres: '',
    ipmNumero: '',
    permisConduire: 'NON',
    categoriePermis: '',
    statut: 'ACTIF',
    motifSortie: '',
    dateSortie: null,
    observations: '',

  }
  showDetailsModal: boolean = false;
  baseUrl: string = environment.apiUrlEmploye;

  constructor(private dialog: MatDialog,
    private employeService: EmployeCompletService,
    private toastr: ToastrService, private agenceService: AgencesService
  ) { }
  ngOnInit(): void {
    this.loadEmployes();
    this.setupSearch();
    this.getAvailableSites();
  }

  setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300), // Attendre 300ms après la dernière saisie
      distinctUntilChanged(), // Ne passer que les valeurs uniques
      switchMap((query) => this.employeService.searchEmployes(query)),
      catchError(() => EMPTY), // En cas d'erreur, retourner un Observable vide
      takeUntil(this.destroy$)
    ).subscribe((res) => {
      this.employeComplet = res.content;
      this.total = res.total ?? 0;
      this.totalPages = Math.ceil(this.total / this.size);
      this.loading = false;
    });
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.modalData = {

      agentId: '',
      matricule: '',
      prenom: '',
      nom: '',
      sexe: '',
      heureDebut: '',
      heureFin: '',
      joursDeTravail: '',
      joursDeTravail2: '',
      dateNaissance: new Date(),
      lieuNaissance: '',
      nationalite: '',
      etatCivil: '',
      adresse: '',
      ville: '',
      telephone1: '',
      telephone2: '',
      email: '',
      contactUrgence: '',
      lienDeParenteAvecContactUrgence: '',
      telephoneUrgent: '',
      agence: [] as string[],
      codeSite: '',
      villeSite: '',
      chefEquipe: '',
      managerOps: '',
      poste: '',
      typeContrat: '',
      dateEmbauche: null,
      dateFinContrat: null,
      tempsDeTravail: '',
      horaire: '',
      salaireDeBase: '',
      primeTransport: '',
      primeAssiduite: '',
      primeRisque: '',
      ribCompteBancaire: '',
      banque: '',
      cnssOuIpres: '',
      ipmNumero: '',
      permisConduire: 'NON',
      categoriePermis: '',
      statut: 'ACTIF',
      motifSortie: '',
      dateSortie: null,
      observations: '',

    };
    this.showModal = true;
    this.selectedId = null
  }

  loadEmployes(): void {
    this.loading = true;
    this.errorMessage = '';
    this.employeService
      .getEmployesComplet(this.page, this.size, this.searchQuery)
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
        this.employeComplet = res.content;
        this.employeComplet = this.employeComplet.map(emp => ({
          ...emp,
          dateNaissance: emp.dateNaissance ? new Date(emp.dateNaissance) : null,
          dateEmbauche: emp.dateEmbauche ? new Date(emp.dateEmbauche) : null,
          dateFinContrat: emp.dateFinContrat ? new Date(emp.dateFinContrat) : null,
          dateSortie: emp.dateSortie ? new Date(emp.dateSortie) : null,
        }));
        this.total = res.total ?? 0;
        this.totalPages = Math.ceil(this.total / this.size);
        this.loading = false;
      });
  }

  openEditModal(employe: EmployeComplet) {
    this.isEditMode = true;
    this.modalData = { ...employe };
    this.selectedId = employe.agentId;
    this.showModal = true;
  }


  closeDetailsModal() {
    this.showDetailsModal = false;
  }

  getAvailableSites() {
    this.agenceService.getAllSites().subscribe(sites => {
      this.availableSites = sites;
    });
  }

  onFieldChange() {
    if (this.modalData.agence.length === 1) this.myMethod(this.modalData.agence[0]);
    else if (this.modalData.agence.length === 2) this.myMethod2(this.modalData.agence[1]);
  }

  myMethod(value: string) {
    this.agenceService.getJoursOuverture(value).subscribe(data => {
      return this.modalData.joursDeTravail = data;

    })
  }

  myMethod2(value: string) {
    this.agenceService.getJoursOuverture(value).subscribe(data => {
      this.modalData.joursDeTravail2 = data;
    })
  }

  onCheckboxChange(event: any) {
    const value = event.target.value;
    const isChecked = event.target.checked;
    this.siteTouched = true;

    if (isChecked) {
      if (!this.modalData.agence.includes(value)) {
        this.modalData.agence.push(value);
        this.onFieldChange();
      }
    } else {
      this.modalData.agence = this.modalData.agence.filter(s => s !== value);
    }
  }


  viewDetails(employe: EmployeComplet) {
    this.employeCompletSelectionne = employe;
    this.showDetailsModal = true;
  }

  openModal() {
    this.showModal = true;
  }

  deleteRow(matricule: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: "Êtes-vous sûr de vouloir supprimer cet employé ?" },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.employeService.deleteEmploye(matricule).subscribe({
          next: () => {
            this.loadEmployes();
            this.toastr.success('Employé supprimé avec succès !', 'Succès');
          },
          error: (err) => {
            console.error('Erreur de suppression :', err);
            this.toastr.error('Erreur lors de la suppression de l\'employé', 'Erreur');
          }
        });
      }
    });
  }

  closeModal() {
    this.showModal = false;
    this.previewUrl = null;
    this.selectedFile = null;
  }

  


  onFileSelectedUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e: any) => {
      const binary = e.target.result;
      const workbook = XLSX.read(binary, { type: 'binary' });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      this.preview = rows.map((row: any) => <EmployeComplet>{
        agentId: row.agentId,
        matricule: row.matricule,
        prenom: row.prenom,
        nom: row.nom,
        sexe: row.sexe,
        dateNaissance: this.parseDateFromExcel(row.dateNaissance),
        lieuNaissance: row.lieuNaissance,
        nationalite: row.nationalite,
        etatCivil: row.etatCivil,
        adresse: row.adresse,
        ville: row.ville,
        telephone1: row.telephone1,
        telephone2: row.telephone2 || null,
        email: row.email,
        contactUrgence: row.contactUrgence,
        lienDeParenteAvecContactUrgence: row.lienDeParenteAvecContactUrgence,
        telephoneUrgent: row.telephoneUrgent,
        agence: row.agence,
        codeSite: row.codeSite,
        villeSite: row.villeSite,
        chefEquipe: row.chefEquipe,
        managerOps: row.managerOps,
        poste: row.poste,
        typeContrat: row.typeContrat,
        dateEmbauche: this.parseDateFromExcel(row.dateEmbauche),
        dateFinContrat: this.parseDateFromExcel(row.dateFinContrat),
        tempsDeTravail: row.tempsDeTravail,
        horaire: row.horaire,
        salaireDeBase: row.salaireDeBase,
        primeTransport: row.primeTransport,
        primeAssiduite: row.primeAssiduite,
        primeRisque: row.primeRisque,
        ribCompteBancaire: row.ribCompteBancaire,
        banque: row.banque,
        cnssOuIpres: row.cnssOuIpres,
        ipmNumero: row.ipmNumero,
        permisConduire: row.permisConduire,
        categoriePermis: row.categoriePermis,
        statut: row.statut,
        motifSortie: row.motifSortie,
        dateSortie: this.parseDateFromExcel(row.dateSortie),
        observations: row.observations,
      });
    };

    reader.readAsBinaryString(file);
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
  ouvrirDetails(employeComplet: EmployeComplet): void {
    this.employeCompletSelectionne = employeComplet;
    this.showDetailsModal = true;
  }
  fermerModal() {
    this.employeCompletSelectionne = null;
  }

  editEmploye(employe: EmployeComplet) {
    this.isEditMode = true;
    this.modalData = { ...employe };
    this.selectedId = employe.matricule;
    this.showModal = true;
  }



  saveModal(form: NgForm) {

  if (form.invalid) {
    Object.values(form.controls).forEach(control => control.markAsTouched());
    this.toastr.error('Veuillez remplir tous les champs obligatoires.', 'Erreur');
    return;
  }

  this.isLoading = true;

  // --- Préparation du FormData
  const formData = new FormData();
  const payload = {
    ...this.modalData,
    dateNaissance: this.modalData.dateNaissance ? this.modalData.dateNaissance.toISOString() : null,
    dateEmbauche: this.modalData.dateEmbauche ? this.modalData.dateEmbauche.toISOString() : null,
    dateFinContrat: this.modalData.dateFinContrat ? this.modalData.dateFinContrat.toISOString() : null,
    dateSortie: this.modalData.dateSortie ? this.modalData.dateSortie.toISOString() : null,
  };

  formData.append('employe', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
  if (this.selectedFile) {
    formData.append('photo', this.selectedFile);
  }

  // ======================================================================
  //                          MODE EDITION
  // ======================================================================
  if (this.isEditMode && this.selectedId) {
    this.employeService.updateEmployeComplet(this.selectedId, formData).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: () => {
        this.loadEmployes();
        this.closeModal();
        this.toastr.success('Employé mis à jour avec succès !', 'Succès');
      },
      error: () => {
        this.toastr.error('Erreur lors de la mise à jour.', 'Erreur');
      }
    });
    return;
  }

  // ======================================================================
  //              MODE CRÉATION – DÉBUT DU PIPE
  // ======================================================================
  this.employeService.getEmployeCompletByAgentId(this.modalData.agentId).pipe(

    catchError(err => err.status === 404 ? of(null) : throwError(() => err)),

    switchMap(existingByCode => {
      if (existingByCode) {
        this.toastr.error('Un employé avec ce code existe déjà.', 'Erreur');
        return EMPTY;
      }
      return this.employeService.getByPrenomNom(this.modalData.prenom, this.modalData.nom).pipe(
        catchError(err => err.status === 404 ? of(null) : throwError(() => err))
      );
    }),

    switchMap(existingByName => {
      if (existingByName) {
        this.toastr.error('Un employé avec ce nom existe déjà.', 'Erreur');
        return EMPTY;
      }

      // ======================================================================
      //              🔥 INTÉGRATION DU CODE 1 — LOGIQUE HORAIRES + AGENCES
      // ======================================================================

      const sites = this.modalData.agence ?? []; // Récupérer les agences sélectionnées

      
      // ============================================================
      // Cas 2 agences
      // ============================================================
      if (sites.length === 2) {

        return forkJoin([
          this.agenceService.getAgenceByNom(sites[0]),
          this.agenceService.getAgenceByNom(sites[1])
        ]).pipe(
          switchMap(([ag1, ag2]) => {

            const h1 = ag1.heuresTravail.split('-')[0].trim();
            const h2 = ag1.heuresTravail.split('-')[1].trim();
            const h3 = ag2.heuresTravail.split('-')[0].trim();
            const h4 = ag2.heuresTravail.split('-')[1].trim();

            if (
              this.compareHeures(h1, this.modalData.heureDebut) <= 0 &&
              this.compareHeures(this.modalData.heureFin, h2) <= 0 &&
              this.compareHeures(h3, this.modalData.heureDebut2 ?? '') <= 0 &&
              this.compareHeures(this.modalData.heureFin2 ?? '', h4) <= 0
            ) {

              // Vérifier capacité des 2 agences
              return forkJoin({
                count1: this.agenceService.getNumberofEmployeesInOneAgence(sites[0]),
                max1: this.agenceService.MaxNumberOfEmployeesInOneAgence(sites[0]),
                count2: this.agenceService.getNumberofEmployeesInOneAgence(sites[1]),
                max2: this.agenceService.MaxNumberOfEmployeesInOneAgence(sites[1])
              }).pipe(
                switchMap(({ count1, max1, count2, max2 }) => {

                  if (count1 >= max1) {
                    this.toastr.error(`Le nombre maximum d'employés dans ${sites[0]} est atteint !`, 'Erreur');
                    return EMPTY;
                  }
                  if (count2 >= max2) {
                    this.toastr.error(`Le nombre maximum d'employés dans ${sites[1]} est atteint !`, 'Erreur');
                    return EMPTY;
                  }

                  // Définir flags matin/après-midi
                  this.modalData.matin = !!this.modalData.heureDebut;
                  this.modalData.apresMidi = !!this.modalData.heureDebut2;

                  // Étape finale : création employé
                  return this.employeService.createEmployeComplet(formData);
                })
              );
            }

            this.toastr.error("Les horaires doivent être compris dans ceux des agences.", "Erreur");
            return EMPTY;
          })
        );
      }

      // ============================================================
      // Cas 1 agence
      // ============================================================
      if (sites.length === 1) {

        return this.agenceService.getAgenceByNom(sites[0]).pipe(
          switchMap(ag1 => {

            const h1 = ag1.heuresTravail.split('-')[0].trim();
            const h2 = ag1.heuresTravail.split('-')[1].trim();

            if (
              this.compareHeures(h1, this.modalData.heureDebut) <= 0 &&
              this.compareHeures(this.modalData.heureFin, h2) <= 0
            ) {
              // Vérifier capacité
              return forkJoin({
                count: this.agenceService.getNumberofEmployeesInOneAgence(sites[0]),
                max: this.agenceService.MaxNumberOfEmployeesInOneAgence(sites[0])
              }).pipe(
                switchMap(({ count, max }) => {

                  if (count >= max) {
                    this.toastr.error(`Capacité maximale atteinte pour ${sites[0]}`, 'Erreur');
                    return EMPTY;
                  }

                  return this.employeService.createEmployeComplet(formData);
                })
              );
            }

            this.toastr.error("Les horaires doivent être compris dans ceux de l'agence.", "Erreur");
            return EMPTY;
          })
        );
      }

      // Aucun site sélectionné = erreur
      this.toastr.error("Veuillez sélectionner au moins une agence.", "Erreur");
      return EMPTY;
    }),

    finalize(() => this.isLoading = false)

  ).subscribe({
  next: result => {
    if (!result) return;
    this.loadEmployes();
    this.closeModal();
    this.toastr.success("Employé ajouté avec succès !", "Succès");
    form.resetForm();
    this.previewUrl = null;
    this.selectedFile = null;
  },
  error: err => {
    console.error(err); 

    if (err.error?.message) {
      this.toastr.error(err.error.message, "Erreur");
    } 
    else if (err.error?.error) {
      this.toastr.error(err.error.error, "Erreur");
    }
    else {
      this.toastr.error("Erreur lors de l'ajout de l'employé.", "Erreur");
    }
  }
});


}


  compareHeures(h1: string, h2: string): number {
    const [h1Hours, h1Minutes] = h1.split(':').map(Number);
    const [h2Hours, h2Minutes] = h2.split(':').map(Number);

    const totalMinutes1 = h1Hours * 60 + h1Minutes;
    const totalMinutes2 = h2Hours * 60 + h2Minutes;

    return totalMinutes1 - totalMinutes2;
  }

  importerDepuisExcel() {
    if (this.preview.length === 0) {
      this.toastr.error('Aucune donnée à importer.', 'Erreur');
      return;
    }

    this.isLoading = true;

    const importObservables = this.preview.map(emp => {
      const formData = new FormData();

      const payload = {
        ...emp,
        dateNaissance: emp.dateNaissance ? emp.dateNaissance.toISOString() : null,
        dateEmbauche: emp.dateEmbauche ? emp.dateEmbauche.toISOString() : null,
        dateFinContrat: emp.dateFinContrat ? emp.dateFinContrat.toISOString() : null,
        dateSortie: emp.dateSortie ? emp.dateSortie.toISOString() : null,
      };

      formData.append('employe', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

      return this.employeService.createEmployeComplet(formData).pipe(
        catchError(err => {
          console.error(`Erreur lors de l'import de ${emp.matricule} :`, err);
          this.toastr.error(`Erreur pour ${emp.prenom} ${emp.nom}`, 'Erreur import');
          return of(null); // continue avec les autres employés
        })
      );
    });

    // 👉 IMPORTANT : exécuter tous les imports
    forkJoin(importObservables)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe(results => {
        const successCount = results.filter(r => r !== null).length;

        this.toastr.success(`${successCount} employés importés avec succès !`, 'Succès');

        this.preview = []; // vider le preview
        this.loadEmployes(); // recharger la liste réelle
      });
  }


  // Fonction utilitaire pour parser une date au format "dd/MM/yyyy" et retourner un objet Date
  parseDateFromExcel(value: string | null): Date | null {
    if (!value || typeof value !== 'string') return null;

    const parts = value.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months start at 0
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);

    return isNaN(date.getTime()) ? null : date;
  }



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
      this.loadEmployes();
    }
  }

  // ⏮️ Pagination précédente
  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadEmployes();
    }
  }

  // 🔢 Aller à une page spécifique
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.page = page;
      this.loadEmployes();
    }
  }


  // 🧹 Nettoyage des abonnements. 
  ngOnDestroy(): void {
    this.destroy$.next(); // Signale la fin des abonnements.  interrompt toutes les souscriptions liées. Émet un signal pour dire “stoppez toutes les souscriptions actives”.
    this.destroy$.complete(); // Termine le Subject pour libérer les ressources.
  }
  /**
   * Résultat ✅ :
     Toutes les souscriptions takeUntil(this.destroy$) sont automatiquement désabonnées.
     Tu évites toute fuite de mémoire quand le composant est détruit (par exemple, quand tu changes de page).
   */
}
