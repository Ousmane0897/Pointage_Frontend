import { Component, OnInit } from '@angular/core';
import { Admin } from '../../models/admin.model';
import { AdminService } from '../../services/admin.service';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { HttpClientModule } from '@angular/common/http';
import { LoginService } from '../../services/login.service';
import { Router, RouterOutlet } from '@angular/router';
import { } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { NgxSpinnerService } from 'ngx-spinner';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-gestion-privilege',
  imports: [
    FormsModule,
    CommonModule,
    // TODO: `HttpClientModule` should not be imported into a component directly.
    // Please refactor the code to add `provideHttpClient()` call to the provider list in the
    // application bootstrap logic and remove the `HttpClientModule` import from this component.
    HttpClientModule,
    RouterOutlet,
    LucideAngularModule
  ],
  templateUrl: './gestion-privilege.component.html',
  styleUrl: './gestion-privilege.component.scss'
})
export class GestionPrivilegeComponent implements OnInit {

  admins: Admin[] = [];
  selectedAdmin: Admin | null = null;
  role: string[] = ['EXPLOITATION', 'BACKOFFICE', 'SUPERVISEUR', 'MAGASINIER', 'RESPONSABLE_IT', 'Responsable_QHSE', 'CONTROLEUR_STOCK', 'RESPONSABLE_CHIMIE', 'RH'];
  searchText: string = '';
  showModal = false;
  showPassword: boolean = false;
  modalData: Admin = {

    prenom: '',
    nom: '',
    email: '',
    password: '',
    poste: '',
    role: '',
    modulesAutorises: {
      dashboard: false,
      admin: false,
      rh: {
        // 6.1 Gestion du Personnel
        dossierEmploye: false,
        contrats: false,
        organigramme: false,
        periodeEssai: false,
        titularisations: false,
        documents: false,
        // 6.2 Temps & Présences
        pointageCentralise: false,
        absences: false,
        conges: false,
        heuresSupplementaires: false,
        recapitulatif: false,
        // 6.3 Paie
        grilleSalariale: false,
        calculBulletin: false,
        historiquePaies: false,
        declarations: false,
        // 6.4 Développement RH
        formations: false,
        evaluations: false,
        sanctions: false,
        tableauBordRh: false
      },

      productionChimie: {
        formulations: false,
        ordresFabrication: false,
        lots: false,
        controleQualite: false,
        matieresPremieres: false,
        conditionnement: false,
        tableauBord: false
      },
      terrain: {
        sitesClients: false,
        planning: false,
        pointage: false,
        alertes: false,
        interventions: false,
        controleQualite: false,
        materiel: false,
        phytosanitaire: false,
        tableauBord: false
      },
      stock: {
        // 7.3 Stocks & Approvisionnement
        catalogue: false,
        mouvements: false,
        etatStock: false,
        inventaires: false,
        synthese: false,
        approvisionnement: false,
        tableauBord: false,
        // 7.4 Contrôle des mouvements
        categorisation: false,
        bonsEntree: false,
        bonsSortie: false,
        workflowValidation: false,
        historiqueDestinataire: false,
        plafonds: false,
        dotation: false,
        rapportsConso: false,
        // 7.5 Analyse des consommations
        analyseMensuelle: false,
        chantiers: false,
        dons: false,
        comparatif: false,
        filtresCroises: false,
        // 7.6 Valorisation financière
        coutUnitaire: false,
        coutMouvements: false,
        valeurStock: false,
        coutSite: false,
        coutChantier: false,
        marges: false,
        tableauBordFinancier: false
      }

    },
    motifDesactivation: '',
    active: true,

  }

  isEditMode = false;
  selectedId: string | null = null;
  confirmPassword: string = "";
  private destroy$ = new Subject<void>(); // Pour gérer le cycle de vie des abonnements et éviter les fuites de mémoire


  constructor(private adminService: AdminService,
    private dialog: MatDialog, private toastr: ToastrService,
    private loginService: LoginService, private router: Router, private spinner: NgxSpinnerService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }


  loadData() {
    this.adminService.getAdmins().pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.admins = data;
    });
  }



  openAddModal() {
    this.isEditMode = false;
    this.modalData = {
      prenom: '', nom: '', email: '', password: '', poste: '', role: '', modulesAutorises: {
        dashboard: false,
        admin: false,
        rh: {
          // 6.1 Gestion du Personnel
          dossierEmploye: false,
          contrats: false,
          organigramme: false,
          periodeEssai: false,
          titularisations: false,
          documents: false,
          // 6.2 Temps & Présences
          pointageCentralise: false,
          absences: false,
          conges: false,
          heuresSupplementaires: false,
          recapitulatif: false,
          // 6.3 Paie
          grilleSalariale: false,
          calculBulletin: false,
          historiquePaies: false,
          declarations: false,
          // 6.4 Développement RH
          formations: false,
          evaluations: false,
          sanctions: false,
          tableauBordRh: false
        },
        productionChimie: {
          formulations: false,
          ordresFabrication: false,
          lots: false,
          controleQualite: false,
          matieresPremieres: false,
          conditionnement: false,
          tableauBord: false
        },
        terrain: {
          sitesClients: false,
          planning: false,
          pointage: false,
          alertes: false,
          interventions: false,
          controleQualite: false,
          materiel: false,
          phytosanitaire: false,
          tableauBord: false
        },
        stock: {
          // 7.3 Stocks & Approvisionnement
          catalogue: false,
          mouvements: false,
          etatStock: false,
          inventaires: false,
          synthese: false,
          approvisionnement: false,
          tableauBord: false,
          // 7.4 Contrôle des mouvements
          categorisation: false,
          bonsEntree: false,
          bonsSortie: false,
          workflowValidation: false,
          historiqueDestinataire: false,
          plafonds: false,
          dotation: false,
          rapportsConso: false,
          // 7.5 Analyse des consommations
          analyseMensuelle: false,
          chantiers: false,
          dons: false,
          comparatif: false,
          filtresCroises: false,
          // 7.6 Valorisation financière
          coutUnitaire: false,
          coutMouvements: false,
          valeurStock: false,
          coutSite: false,
          coutChantier: false,
          marges: false,
          tableauBordFinancier: false
        },

      }, motifDesactivation: '', active: true
    };
    this.confirmPassword = "";
    this.selectedId = null;
    this.showModal = true;
  }

  openEditModal(admin: Admin) {
    this.isEditMode = true;

    // Rétrocompat : un ancien compte stockait `rh` comme booléen unique.
    // Si `rh === true`, on coche toutes les fonctionnalités RH pour préserver
    // l'accès complet après ré-enregistrement.
    const rhLegacyFull = (admin.modulesAutorises?.rh as any) === true;
    const rhSrc: any = admin.modulesAutorises?.rh;

    this.modalData = {
      ...admin,
      modulesAutorises: {
        dashboard: !!admin.modulesAutorises?.dashboard,
        admin: !!admin.modulesAutorises?.admin,
        rh: {
          // 6.1 Gestion du Personnel
          dossierEmploye: rhLegacyFull || !!rhSrc?.dossierEmploye,
          contrats: rhLegacyFull || !!rhSrc?.contrats,
          organigramme: rhLegacyFull || !!rhSrc?.organigramme,
          periodeEssai: rhLegacyFull || !!rhSrc?.periodeEssai,
          titularisations: rhLegacyFull || !!rhSrc?.titularisations,
          documents: rhLegacyFull || !!rhSrc?.documents,
          // 6.2 Temps & Présences
          pointageCentralise: rhLegacyFull || !!rhSrc?.pointageCentralise,
          absences: rhLegacyFull || !!rhSrc?.absences,
          conges: rhLegacyFull || !!rhSrc?.conges,
          heuresSupplementaires: rhLegacyFull || !!rhSrc?.heuresSupplementaires,
          recapitulatif: rhLegacyFull || !!rhSrc?.recapitulatif,
          // 6.3 Paie
          grilleSalariale: rhLegacyFull || !!rhSrc?.grilleSalariale,
          calculBulletin: rhLegacyFull || !!rhSrc?.calculBulletin,
          historiquePaies: rhLegacyFull || !!rhSrc?.historiquePaies,
          declarations: rhLegacyFull || !!rhSrc?.declarations,
          // 6.4 Développement RH
          formations: rhLegacyFull || !!rhSrc?.formations,
          evaluations: rhLegacyFull || !!rhSrc?.evaluations,
          sanctions: rhLegacyFull || !!rhSrc?.sanctions,
          tableauBordRh: rhLegacyFull || !!rhSrc?.tableauBordRh
        },
        productionChimie: {
          formulations: !!admin.modulesAutorises?.productionChimie?.formulations,
          ordresFabrication: !!admin.modulesAutorises?.productionChimie?.ordresFabrication,
          lots: !!admin.modulesAutorises?.productionChimie?.lots,
          controleQualite: !!admin.modulesAutorises?.productionChimie?.controleQualite,
          matieresPremieres: !!admin.modulesAutorises?.productionChimie?.matieresPremieres,
          conditionnement: !!admin.modulesAutorises?.productionChimie?.conditionnement,
          tableauBord: !!admin.modulesAutorises?.productionChimie?.tableauBord
        },
        terrain: {
          sitesClients: !!admin.modulesAutorises?.terrain?.sitesClients,
          planning: !!admin.modulesAutorises?.terrain?.planning,
          pointage: !!admin.modulesAutorises?.terrain?.pointage,
          alertes: !!admin.modulesAutorises?.terrain?.alertes,
          interventions: !!admin.modulesAutorises?.terrain?.interventions,
          controleQualite: !!admin.modulesAutorises?.terrain?.controleQualite,
          materiel: !!admin.modulesAutorises?.terrain?.materiel,
          phytosanitaire: !!admin.modulesAutorises?.terrain?.phytosanitaire,
          tableauBord: !!admin.modulesAutorises?.terrain?.tableauBord
        },
        stock: {
          // 7.3 Stocks & Approvisionnement
          catalogue: !!admin.modulesAutorises?.stock?.catalogue,
          mouvements: !!admin.modulesAutorises?.stock?.mouvements,
          etatStock: !!admin.modulesAutorises?.stock?.etatStock,
          inventaires: !!admin.modulesAutorises?.stock?.inventaires,
          synthese: !!admin.modulesAutorises?.stock?.synthese,
          approvisionnement: !!admin.modulesAutorises?.stock?.approvisionnement,
          tableauBord: !!admin.modulesAutorises?.stock?.tableauBord,
          // 7.4 Contrôle des mouvements
          categorisation: !!admin.modulesAutorises?.stock?.categorisation,
          bonsEntree: !!admin.modulesAutorises?.stock?.bonsEntree,
          bonsSortie: !!admin.modulesAutorises?.stock?.bonsSortie,
          workflowValidation: !!admin.modulesAutorises?.stock?.workflowValidation,
          historiqueDestinataire: !!admin.modulesAutorises?.stock?.historiqueDestinataire,
          plafonds: !!admin.modulesAutorises?.stock?.plafonds,
          dotation: !!admin.modulesAutorises?.stock?.dotation,
          rapportsConso: !!admin.modulesAutorises?.stock?.rapportsConso,
          // 7.5 Analyse des consommations
          analyseMensuelle: !!admin.modulesAutorises?.stock?.analyseMensuelle,
          chantiers: !!admin.modulesAutorises?.stock?.chantiers,
          dons: !!admin.modulesAutorises?.stock?.dons,
          comparatif: !!admin.modulesAutorises?.stock?.comparatif,
          filtresCroises: !!admin.modulesAutorises?.stock?.filtresCroises,
          // 7.6 Valorisation financière
          coutUnitaire: !!admin.modulesAutorises?.stock?.coutUnitaire,
          coutMouvements: !!admin.modulesAutorises?.stock?.coutMouvements,
          valeurStock: !!admin.modulesAutorises?.stock?.valeurStock,
          coutSite: !!admin.modulesAutorises?.stock?.coutSite,
          coutChantier: !!admin.modulesAutorises?.stock?.coutChantier,
          marges: !!admin.modulesAutorises?.stock?.marges,
          tableauBordFinancier: !!admin.modulesAutorises?.stock?.tableauBordFinancier
        }
      }
    };

    this.confirmPassword = admin.password;
    this.selectedId = admin.id!;
    this.showModal = true;
  }



  closeModal() {
    this.showModal = false;
  }

  saveModal(form: NgForm) {

    this.spinner.show();

    if (form.invalid) {
      Object.values(form.controls).forEach(control => control.markAsTouched());
      this.toastr.error('Veuillez remplir tous les champs obligatoires.', 'Erreur');
      this.spinner.hide();
      return;
    }

    if (this.modalData.password !== this.confirmPassword) {
      this.toastr.error('Les mots de passe ne correspondent pas.', 'Erreur');
      this.spinner.hide();
      return;
    }

    // Fonction récursive pour transformer toutes les propriétés boolean
    const transformModules = (obj: any): any => {
      const newObj: any = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;

        const value = obj[key];
        if (typeof value === 'boolean') {
          newObj[key] = value; // boolean direct
        } else if (typeof value === 'object' && value !== null) {
          newObj[key] = transformModules(value); // récursion pour sous-objets
        } else {
          newObj[key] = value; // autres types si besoin
        }
      }
      return newObj;
    };

    this.modalData.modulesAutorises = transformModules(this.modalData.modulesAutorises);

    if (this.isEditMode && this.selectedId) {
      // Mise à jour
      this.adminService.updateAdmin(this.selectedId, this.modalData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadData();
            this.closeModal();
            this.toastr.success('Admin mis à jour avec succès !', 'Succès');
            this.spinner.hide();
          },
          error: (err) => {
            console.error('Erreur mise à jour admin :', err);
            this.spinner.hide();
            const msg = this.extraireMessageErreur(
              err,
              err.status === 409
                ? 'Conflit : cet email existe déjà ou une erreur serveur est survenue.'
                : 'Erreur lors de la mise à jour de l\'admin'
            );
            this.toastr.error(msg, 'Erreur');
          }
        });
    } else {
      // Création
      this.adminService.createAdmin(this.modalData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadData();
            this.closeModal();
            this.toastr.success('Admin créé avec succès !', 'Succès');
            this.spinner.hide();
          },
          error: (err) => {
            console.error('Erreur création admin :', err);
            this.spinner.hide();
            const msg = this.extraireMessageErreur(
              err,
              err.status === 409
                ? 'Conflit : cet email existe déjà ou une erreur serveur est survenue.'
                : 'Erreur lors de la création de l\'admin'
            );
            this.toastr.error(msg, 'Erreur');
          }
        });
    }
  }

  /**
   * Extrait un message d'erreur lisible depuis une réponse HTTP, en couvrant les
   * différents formats renvoyés par le backend (`err.error.message`,
   * `err.error.error`, ou une chaîne brute). Retourne `fallback` si rien d'exploitable.
   */
  private extraireMessageErreur(err: any, fallback: string): string {
    if (typeof err?.error === 'string') return err.error;
    return err?.error?.message ?? err?.error?.error ?? fallback;
  }

  get filteredAdmins() {
    const term = this.searchText.toLowerCase();
    return this.admins.filter(employe =>
      ` ${employe.prenom} ${employe.nom} ${employe.email} ${employe.password} ${employe.poste} ${employe.role} ${employe.motifDesactivation} ${employe.active}`
        .toLowerCase()
        .includes(term)
    );
  }
  toggleStatus(admin: Admin): void {
    const updated = { ...admin, active: !admin.active };
    this.adminService.updateAdmin(admin.id!, updated).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastr.success(`Admin ${updated.active ? 'activé' : 'désactivé'} avec succès !`, 'Succès');
        this.loadData();
      },
      error: (err) => {
        console.error('Erreur de mise à jour du statut :', err);
        this.toastr.error('Erreur lors de la mise à jour du statut de l\'admin', 'Erreur');
      }
    });
  }

  logout() {
    this.loginService.logout();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }


  deleteRow(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: "Êtes-vous sûr de vouloir supprimer cet admin ?" },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.adminService.deleteAdmin(id!).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.loadData();
            this.toastr.success('admin supprimé avec succès !', 'Succès');
          },
          error: (err) => {
            console.error('Erreur de suppression :', err);
            this.toastr.error('Erreur lors de la suppression de l\'admin', 'Erreur');
          }
        });
      }
    });
  }

  trackById(_: number, item: Admin): string {
    return item.poste + item.email; // plus sûr si plusieurs pointages par jour
  }

}
