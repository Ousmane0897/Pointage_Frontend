import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Employe } from '../../models/employe.model';
import { EmployeService } from '../../services/employe.service';
import { ToastrService } from 'ngx-toastr';
import { Planification } from '../../models/planification.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { PlanificationService } from '../../services/planification.service';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { AgencesService } from '../../services/agences.service';
import { interval, Subscription, switchMap } from 'rxjs';
import { ConfirmDialogService } from '../../shared/confirm-dialog.service';
import { LoginService } from '../../services/login.service';

@Component({
    selector: 'app-planification',
    imports: [
        CommonModule,
        FormsModule,
        NgxMatTimepickerModule,
        MatInputModule,
        MatFormFieldModule,
        MatDatepickerModule,
        MatNativeDateModule
    ],
    providers: [
        { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' } // si tu veux en français
    ],
    templateUrl: './planification.component.html',
    styleUrls: ['./planification.component.scss']
})
export class PlanificationComponent implements OnInit {


  employes: Employe[] = [];
  planifications: Planification[] = [];
  planificationAVenir: Planification[] = [];
  planificationEnCours: Planification[] = [];
  planificationTerminee: Planification[] = [];
  searchText: string = '';
  availableSites: string[] = []; // Liste des sites disponibles
  employeCreePar: string | null = null;
  showModal = false;      // contrôle de l'affichage
  showModal2 = false;    // contrôle de l'affichage
  showModal3 = false;    // contrôle de l'affichage
  showModal4 = false;    // contrôle de l'affichage
  modalVisible = false;   // contrôle de l’animation
  isEditMode = false;
  selectedId: string | null = null;
  private refreshSub?: Subscription;
  requestedBy: string | null = null;
  role: string | null = null;
  poste: string | null = null;
  modalData: Planification = {
    prenomNom: '',
    codeSecret: '',
    nomSite: '',
    siteDestination: [] as string[],
    personneRemplacee: '',
    dateDebut: null,
    dateFin: null,
    matin: false,
    apresMidi: false,
    heureDebut: '',
    heureFin: '',
    statut: 'EN_ATTENTE',
    commentaires: '',
    motifAnnulation: null,
    dateCreation: null

  };




  constructor(private planification: PlanificationService,
    private toastr: ToastrService,
    private employeService: EmployeService,
    private dialog: MatDialog,
    private planfication: PlanificationService,
    private agence: AgencesService,
    private confirmDialogService: ConfirmDialogService,
    private cdr: ChangeDetectorRef,
    private loginService: LoginService
  ) { }

  ngOnInit(): void {
    this.loadData();
    this.getAvailableSites();


    // 2) rafraîchissement automatique toutes les 10s (utilise RxJS)
    this.refreshSub = interval(10000)
      .pipe(switchMap(() => this.planfication.getPlanifications()))
      .subscribe(data => this.planifications = data);

    this.requestedBy = this.loginService.getFirstNameLastName();
    this.role = this.loginService.getUserRole();
    this.poste = this.loginService.getUserPoste();
  }

  //ngOnDestroy() dans ton composant sert à empêcher les appels automatiques et 
  // les fuites mémoire quand l’utilisateur quitte la page, en stoppant proprement l’abonnement à ton interval.
  // ngOnDestroy() Est appelé juste avant que le composant disparaisse (par exemple quand tu changes de route, ou quand Angular détruit le composant du DOM). 
  // Sert à nettoyer : désabonner les observables infinis (interval, WebSocket, etc.),arrêter des timers (setInterval, setTimeout),détacher des listeners (addEventListener),libérer des ressources (sockets, workers, etc.).
  ngOnDestroy(): void {
    if (this.refreshSub) this.refreshSub.unsubscribe();
  }

  loadData() {
    this.planfication.getPlanifications().subscribe(data => {
      this.planifications = data;
    }, error => {
      this.toastr.error('Failed to load employes', 'Error');
      console.error('Error fetching employes:', error);
    });

  }

  readonlyIfStatusIsExecuted(planification: Planification): boolean {
    if (planification.statut === 'EXECUTEE' || planification.statut === 'ANNULEE') {
      return true;
    }
    return false;
  }


  /*cancelTask(id?: string) {
    if (!id) return;
    this.planfication.cancelPlanification(id).subscribe(() => this.loadData());
  }*/

  cancelTask(planificationId: string) {
    this.confirmDialogService.confirm({
      title: 'Confirmation',
      message: 'Veuillez indiquer le motif de l\'annulation :',
      confirmText: this.role === 'SUPERADMIN' ? 'Oui, annuler' : 'Demander l\'annulation à la directrice',
      cancelText: 'Non'
    }).subscribe(motif => {
      if (!motif || motif.trim() === '') {
        this.toastr.error('Le motif d\'annulation est obligatoire.', 'Erreur');
        return; // Si le motif est vide ou nul, la fonction cancelTask s’arrête ici. Aucune autre ligne après ce return ne sera exécutée. Cela permet d’éviter d’envoyer une annulation ou une demande sans motif.
      }

      const todayISO: string = new Date().toISOString();

      // Récupérer la planification via le service
      this.planification.getPlanificationById(planificationId).subscribe({
        next: (planif) => {
          const dateDebut = new Date(planif.dateDebut!); // transforme la string ISO en Date
          if (this.diffInHours(todayISO, dateDebut.toISOString()) < 24 && this.role !== 'SUPERADMIN') {
            this.toastr.error(
              'Une annulation doit être faite au moins 24 heures avant la date de début.',
              'Erreur'
            );
            return;
          }

          if (this.role === 'SUPERADMIN') {
            // Annulation directe
            this.planification.cancelPlanification(planificationId, motif, this.requestedBy!).subscribe({
              next: (updatedPlanif) => {
                this.modalData = { ...this.modalData, motifAnnulation: updatedPlanif.motifAnnulation };
                this.cdr.detectChanges();
                console.log('ModalData MAJ :', this.modalData);
                this.toastr.success('Planning annulé avec succès !', 'Succès');
                this.loadData();
              },
              error: (err) => {
                console.error('Erreur d\'annulation :', err);
                this.toastr.error('Erreur lors de l\'annulation du planning', 'Erreur');
              }
            });
          } else if (this.role!.toUpperCase() === 'ADMIN') {
            // Demande d'annulation pour les admins
            this.planification.demanderAnnulation(planificationId, motif, this.requestedBy!).subscribe({
              next: (updatedPlanif) => {
                this.modalData = { ...this.modalData, motifAnnulation: updatedPlanif.motif };
                this.cdr.detectChanges();
                console.log('ModalData MAJ :', this.modalData);
                this.toastr.success('Demande d\'annulation envoyée avec succès !', 'Succès');
                this.loadData();
              },
              error: (err) => {
                console.error('Erreur lors de la demande d\'annulation :', err);
                this.toastr.error('Erreur lors de l\'envoi de la demande d\'annulation', 'Erreur');
              }
            });
          }
        },
        error: (err) => {
          console.error('Erreur récupération planification :', err);
          this.toastr.error('Impossible de récupérer la planification', 'Erreur');
        }
      });
    });
  }




  /*loadPlanifications(codeSecret: string) {
    this.planification.getPlanificationById(codeSecret).subscribe(data => {
      this.planifications = data;
      console.log('Planifications:', this.planifications);
    }, error => {
      this.toastr.error('Failed to load planifications', 'Error');
      console.error('Error fetching planifications:', error);
    });
  }*/



  openEditModal(planification: Planification) {
    this.isEditMode = true;
    this.modalData = {
      ...planification,
      dateDebut: planification.dateDebut ? new Date(planification.dateDebut) as any : null,
      dateFin: planification.dateFin ? new Date(planification.dateFin) as any : null,
      dateCreation: planification.dateCreation ? new Date(planification.dateCreation) as any : null,
    }; // Clone the planification data to modalData

    console.log('Planification reçue pour édition:', planification);
    console.log('codeSecret:', planification.codeSecret);

    this.selectedId = planification.codeSecret;
    this.showModal = true;
    setTimeout(() => {
      this.modalVisible = true;
    }, 10); // petit délai pour déclencher la transition
    this.showModal2 = false; // Ferme le modal précédent s'il est ouvert


  }

  getAvailableSites() {
    this.agence.getAllSites().subscribe(sites => {
      this.availableSites = sites;
    });
  }
  /*openAddModal() {
    this.isEditMode = false;
    this.modalData = { nomPrenom:'',codeSecret: '', nomSite: '', siteDestination:'', dateDebut: '', dateFin: '', heureDebut: '', heureFin: '', statut:'', commentaires: null,  dateCreation: '' };
    this.selectedId = null;
    this.showModal = true;
    setTimeout(() => {
      this.modalVisible = true;
    }, 10); // petit délai pour déclencher la transition
  }*/


  closeModal() {
    this.modalVisible = false; // déclenche la sortie (opacity-0)
    setTimeout(() => {
      this.showModal = false; // enlève du DOM ou cache via [hidden]
    }, 300); // durée de la transition CSS en ms
  }

  closeModal2() {
    this.showModal2 = !this.showModal2;
  }

  closeModal3() {
    this.showModal3 = !this.showModal3;
  }

  closeModal4() {
    this.showModal4 = !this.showModal4;
  }




  get filteredEmployes() {
    const term = this.searchText.toLowerCase();
    return this.employes.filter(employe =>
      `${employe.codeSecret} ${employe.prenom} ${employe.nom} ${employe.numero} ${employe.intervention} ${employe.statut} ${employe.employeCreePar} ${employe.site}`
        .toLowerCase()
        .includes(term)
    );
  }

  convertirVersISO(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toISOString(); // ex: "2025-12-31T00:00:00.000Z"
  }

  saveModal() {

    if (this.isEditMode && this.selectedId) {
      const dateDebutStr = this.modalData.dateDebut; // format ISO venant de la base
      if (!dateDebutStr) {
        this.toastr.error('La date de début est invalide.', 'Erreur');
        return;
      }
      const dateDebut = new Date(dateDebutStr);
      const aujourdHui = new Date();

      // Pour éviter les erreurs liées à l'heure (surtout en UTC vs local), on remet les deux dates à minuit
      dateDebut.setUTCHours(0, 0, 0, 0);
      aujourdHui.setHours(0, 0, 0, 0); // ici on utilise locale pour la date du jour

      const diffTime = dateDebut.getTime() - aujourdHui.getTime();
      const diffJours = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      console.log(`Il reste ${diffJours} jour(s)`);
      if (diffJours > 7) {
        this.planification.updatePlanification(this.selectedId, this.modalData).subscribe(() => {
          this.closeModal2();
          this.toastr.success('Planning mis à jour avec succès!', 'Succès');
        });
      }
      else {
        this.toastr.error('La date de début doit être supérieure à 7 jours à partir d’aujourd’hui pour pouvoir modifier.', 'Erreur');
      }
    } else {

      this.toastr.error('Erreur survenue pendant la mise à jour', 'Erreur')
    }
  }

  deleteplanification(codeSecret: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: "Êtes-vous sûr de vouloir supprimer ce planning ?" },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.planification.deletePlanification(codeSecret).subscribe({
          next: () => {
            this.loadData();
            this.toastr.success('Planning supprimé avec succès !', 'Succès');
          },
          error: (err) => {
            console.error('Erreur de suppression :', err);
            this.toastr.error('Erreur lors de la suppression du planning', 'Erreur');
          }
        });
      }
    });
  }

  getStatusClass(status?: string) {
    switch (status) {
      case 'EN_ATTENTE': return 'bg-yellow-200 text-yellow-800';
      case 'EN_COURS': return 'bg-blue-200 text-blue-800 animate-pulse';
      case 'EXECUTEE': return 'bg-green-200 text-green-800';
      case 'ANNULEE': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  }

  diffInHours(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    const diffMs = d2.getTime() - d1.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    return diffHours;
  }

  formatDateToDDMMYYYY(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR'); // change "Sat Aug 10 2025 00:00:00 GMT+0000"  → "10/08/2025"
  }

  convertToJsDate(dateString: string): string {
    const [day, month, year] = dateString.split('/');
    const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
    return date.toString(); // change "10/08/2025" -> "Sat Aug 10 2025 00:00:00 GMT+0000"
  }

  isoToDdMmYyyy(isoDateStr: string): string {
    const date = new Date(isoDateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  jsDateToIso(date: Date): string {
    return date.toISOString();
  }











}
