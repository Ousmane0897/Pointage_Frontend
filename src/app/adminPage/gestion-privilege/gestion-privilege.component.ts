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

@Component({
  selector: 'app-gestion-privilege',
  imports: [
    FormsModule,
    CommonModule,
    // TODO: `HttpClientModule` should not be imported into a component directly.
    // Please refactor the code to add `provideHttpClient()` call to the provider list in the
    // application bootstrap logic and remove the `HttpClientModule` import from this component.
    HttpClientModule,
    RouterOutlet
  ],
  templateUrl: './gestion-privilege.component.html',
  styleUrl: './gestion-privilege.component.scss'
})
export class GestionPrivilegeComponent implements OnInit {

  admins: Admin[] = [];
  selectedAdmin: Admin | null = null;
  role: string[] = ['EXPLOITATION', 'BACKOFFICE', 'SUPERVISEUR', 'MAGASINIER', 'RESPONSABLE_IT', 'Responsable_QHSE', 'CONTROLEUR_STOCK'];
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
      statistiquesAgences: false,
      planifications: false,
      calendrier: false,
      jourFeries: false,
      employes: false,
      agences: false,

      stock: {
        produits: false,
        entrees: false,
        sorties: false,
        suivis: false,
        historiquesEntrees: false,
        historiquesSorties: false
      },
      collecteLivraison: {
        collecteBesoins: false,
        suiviLivraison: false
      },
      absences: {
        tempsReel: false,
        historiqueAbsences: false
      },
      pointages: {
        pointagesDuJour: false,
        historiquePointages: false
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
        statistiquesAgences: false,
        planifications: false,
        calendrier: false,
        stock: {
          produits: false,
          entrees: false,
          sorties: false,
          suivis: false,
          historiquesEntrees: false,
          historiquesSorties: false
        },
        collecteLivraison: {
          collecteBesoins: false,
          suiviLivraison: false
        },
        jourFeries: false,
        employes: false,
        agences: false,
        absences: {
          tempsReel: false,
          historiqueAbsences: false
        },
        pointages: {
          pointagesDuJour: false,
          historiquePointages: false
        },

      }, motifDesactivation: '', active: true
    };
    this.confirmPassword = "";
    this.selectedId = null;
    this.showModal = true;
  }

  openEditModal(admin: Admin) {
    this.isEditMode = true;

    this.modalData = {
      ...admin,
      modulesAutorises: {
        dashboard: !!admin.modulesAutorises?.dashboard,
        admin: !!admin.modulesAutorises?.admin,
        statistiquesAgences: !!admin.modulesAutorises?.statistiquesAgences,
        planifications: !!admin.modulesAutorises?.planifications,
        calendrier: !!admin.modulesAutorises?.calendrier,
        stock: {
          produits: !!admin.modulesAutorises?.stock?.produits,
          entrees: !!admin.modulesAutorises?.stock?.entrees,
          sorties: !!admin.modulesAutorises?.stock?.sorties,
          suivis: !!admin.modulesAutorises?.stock?.suivis,
          historiquesEntrees: !!admin.modulesAutorises?.stock?.historiquesEntrees,
          historiquesSorties: !!admin.modulesAutorises?.stock?.historiquesSorties
        },
        collecteLivraison: {
          collecteBesoins: !!admin.modulesAutorises?.collecteLivraison?.collecteBesoins,
          suiviLivraison: !!admin.modulesAutorises?.collecteLivraison?.suiviLivraison
        },
        jourFeries: !!admin.modulesAutorises?.jourFeries,
        employes: !!admin.modulesAutorises?.employes,
        agences: !!admin.modulesAutorises?.agences,
        absences: {
          tempsReel: !!admin.modulesAutorises?.absences?.tempsReel,
          historiqueAbsences: !!admin.modulesAutorises?.absences?.historiqueAbsences
        },
        pointages: {
          pointagesDuJour: !!admin.modulesAutorises?.pointages?.pointagesDuJour,
          historiquePointages: !!admin.modulesAutorises?.pointages?.historiquePointages
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
        .subscribe(() => {
          this.loadData();
          this.closeModal();
          this.toastr.success('Admin mis à jour avec succès !', 'Succès');
          this.spinner.hide();
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
            if (err.status === 409) {
              this.toastr.error(err.error.message, 'Erreur');
            } else {
              this.toastr.error('Erreur lors de la création de l\'admin', 'Erreur');
            }
          }
        });
    }
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
