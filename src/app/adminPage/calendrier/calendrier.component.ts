import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, NgForm } from '@angular/forms';
import frLocale from '@fullcalendar/core/locales/fr';
import { Employe } from '../../models/employe.model';
import { EmployeService } from '../../services/employe.service';
import { EventInput } from '@fullcalendar/core';
import { AgencesService } from '../../services/agences.service';
import { Planification } from '../../models/planification.model';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { PlanificationService } from '../../services/planification.service';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { concatMap, finalize } from 'rxjs';
import { co, dE } from '@fullcalendar/core/internal-common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-calendar-employes',
  imports: [CommonModule,
    FullCalendarModule,
    MatMenuModule,
    MatButtonModule,
    FormsModule,
    NgxMatTimepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './calendrier.component.html',
  styleUrls: ['./calendrier.component.scss']
})
export class CalendrierComponent implements OnInit {


  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;

  events: EventInput[] = [];
  selectedEmploye: any = null;
  menuPosition = { x: '0px', y: '0px' };
  selectedSite = '';
  availableSites: string[] = []; // Liste des sites disponibles
  showModal = false;
  isEditMode = false;
  selectedId: string | null = null;
  modalVisible = false;
  getPlanification!: Planification;
  getEmployeByCodeSecret!: Employe;
  employesDeplaces: Employe[] = [];
  employeesDansUnSite: Employe[] = [];
  isMobile = false;
  showDetails = false;
  modalData: Planification = {
    prenomNom: '',
    codeSecret: '',
    nomSite: '',
    siteDestination: [] as string[],
    personneRemplacee: '',
    matin: false,
    apresMidi: false,
    dateDebut: null,
    dateFin: null,
    heureDebut: '',
    heureFin: '',
    statut: 'EN_ATTENTE',
    commentaires: '',
    motifAnnulation: null,
    dateCreation: null
  };

  calendarOptions: any = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    locales: [frLocale],
    locale: 'fr',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridWeek,dayGridMonth'
    },
    allDaySlot: false,
    editable: true,
    eventResizableFromStart: true,
    //hiddenDays: [0], // dimanche
    events: [],
    eventClick: this.handleEventClick.bind(this),
    eventDrop: this.handleEventChange.bind(this),
    eventResize: this.handleEventChange.bind(this)
  };

  constructor(private employesService: EmployeService, private agence: AgencesService,
    private planification: PlanificationService, private toastr: ToastrService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.employesService.getEmployes().subscribe((data: Employe[]) => {
      const events = this.generateYearlyEvents(data);
      this.events = events;
      this.applyFilter();
      this.getAvailableSites();
      this.getEmployesDeplaces();

    });
  }

  getPlanificationByCodeEmploye(codeSecret: string) {
    this.planification.getPlanificationByCodeEmploye(codeSecret).subscribe(data => {
      this.getPlanification = data;
      console.log('Planification de l\'employé:', this.getPlanification);
    });
  }

  getEmployesDeplaces() {
    this.employesService.getEmployeEnDeplacement().subscribe(data => {
      this.employesDeplaces = data;
      console.log('site destination employé:', this.employesDeplaces[0].site);
      console.log('site avant déplacement employé:', this.employesDeplaces[0].siteAvantDeplacement);
      console.log('Employés en déplacement:', this.employesDeplaces);
    });
  }

  EmployeesDansUnSite() {
    const site = this.modalData.siteDestination?.[0];

    if (!site) {
      this.employeesDansUnSite = [];
      return;
    }

    this.employesService.getEmployeesDansUnSite(site).subscribe({
      next: (data) => this.employeesDansUnSite = data,
      error: () => {
        this.employeesDansUnSite = [];
        this.toastr.error("Impossible de récupérer les employés du site", "Erreur");
      }
    });
  }



  onSiteChange(selectedSite: string) {
    // Vérifie que l'utilisateur a choisi une valeur
    if (selectedSite) {
      this.EmployeesDansUnSite(); // Appel au backend
    } else {
      this.employeesDansUnSite = []; // vide la liste si aucune valeur
    }
  }


  changeMobileState(emp: Employe) {
    if (emp.deplacement) {
      this.isMobile = true;
    }
  }

  close() {
    this.showDetails = false
  }


  getAvailableSites() {
    this.agence.getAllSites().subscribe(sites => {
      this.availableSites = sites;
    });
  }

  saveModal(form: NgForm) {
    if (form.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.values(form.controls).forEach(control => {
        control.markAsTouched();
      });

      this.toastr.error('Veuillez remplir tous les champs obligatoires.', 'Erreur');
      return;
    }
    if (this.isEditMode && this.selectedId) {
      this.planification.updatePlanification(this.selectedId, this.modalData).subscribe(() => {
        this.closeModal();
        this.toastr.success('Agence mis à jour avec succès !', 'Succès');
      });
    } else {
      if (this.modalData.heureDebut) this.modalData.matin = true;
      // Forcer siteDestination à être un tableau
      if (!Array.isArray(this.modalData.siteDestination)) {
        this.modalData.siteDestination = [this.modalData.siteDestination];
      }

      // Maintenant, payload est correct
      console.log('siteDestination avant post :', this.modalData.siteDestination);
      const payload = {
        ...this.modalData,
        dateDebut: this.modalData.dateDebut ? this.modalData.dateDebut.toISOString() as any : null,
        dateFin: this.modalData.dateFin ? this.modalData.dateFin.toISOString() as any : null,
        dateCreation: this.modalData.dateCreation ? this.modalData.dateCreation.toISOString() as any : null,
      };
      console.log('Payload envoyé :', payload);
      this.planification.addPlanification(payload).pipe(
        finalize(() => this.closeModal()) //   finalize est appelé une seule fois, à la fin de l’Observable, qu’il y ait eu succès ou erreur
        //Idéal pour faire des actions « propres » comme: fermer un modal, arrêter un loader/spinner, réinitialiser un formulaire
      ).subscribe({
        next: () => {
          console.log('site origine:', this.modalData.nomSite);
          console.log('siteDestination après post :', this.modalData.siteDestination);
          this.toastr.success('Planification ajoutée avec succès !', 'Succès');
          this.ngOnInit(); // Rafraîchir les données du calendrier
        },
        error: () => this.toastr.error('Erreur lors de la planification', 'Erreur'),
      });



    }
  }

  getFilteredEvents() {
    if (!this.selectedSite) return this.events;
    return this.events.filter(e => e.extendedProps?.['site'] === this.selectedSite);
  }

  closeModal() {
    this.modalVisible = false; // déclenche la sortie (opacity-0)
    setTimeout(() => {
      this.showModal = false; // enlève du DOM ou cache via [hidden]
    }, 300); // durée de la transition CSS en ms
  }

  openAddModal() {
    this.isEditMode = false;
    this.modalData = { prenomNom: this.selectedEmploye.name, codeSecret: this.selectedEmploye.codeEmploye, nomSite: this.selectedEmploye.departement, siteDestination: [] as string[], personneRemplacee: '', dateDebut: null, dateFin: null, heureDebut: '', heureFin: '', statut: 'EN_ATTENTE', matin: false, apresMidi: false, commentaires: null, motifAnnulation: null, dateCreation: null };
    this.selectedId = null;
    this.showModal = true;
    setTimeout(() => {
      this.modalVisible = true;
    }, 10); // petit délai pour déclencher la transition
  }

  openEditModal(planification: Planification) {
    this.isEditMode = true;
    this.modalData = { ...planification }; // Clone the planification data to modalData
    this.selectedId = planification.codeSecret;
    this.showModal = true;
    setTimeout(() => {
      this.modalVisible = true;
    }, 10); // petit délai pour déclencher la transition


  }

  applyFilter() {
    const filteredEvents = this.getFilteredEvents();

    if (this.calendarOptions.events === filteredEvents) {
      return; // éviter un re-render FullCalendar inutile
    }

    this.calendarOptions = {
      ...this.calendarOptions,
      events: filteredEvents
    };
  }


  getMonday(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  combineDateAndTime(date: Date, time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate.toISOString();
  }

  handleEventClick(clickInfo: any) {
    const event = clickInfo.event;
    const mouseEvent = clickInfo.jsEvent;

    this.menuPosition.x = mouseEvent.clientX + 'px';
    this.menuPosition.y = mouseEvent.clientY + 'px';

    this.selectedEmploye = {
      name: event.title,
      codeEmploye: event.extendedProps.codeEmploye,
      intervention: event.extendedProps.intervention,
      statut: event.extendedProps.statut,
      departement: event.extendedProps.site,
      start: event.start,
      end: event.end,
      deplacement: event.extendedProps.deplacement,
    };

    this.menuTrigger.openMenu();
  }


  handleEventChange(changeInfo: any) {
    const updatedEvent = changeInfo.event;
    const index = this.events.findIndex(e => e.id === updatedEvent.id);
    if (index !== -1) {
      this.events[index] = {
        ...this.events[index],
        start: updatedEvent.start?.toISOString(),
        end: updatedEvent.end?.toISOString()
      };
      this.applyFilter();
    }
  }

  generateYearlyEvents(employes: Employe[]): EventInput[] {
    const events: EventInput[] = [];
    const today = new Date();
    const currentYear = today.getFullYear();

    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();

      employes.forEach(emp => {

        // 🔥 Sécurisation du champ site
        const siteList = Array.isArray(emp.site) // Vérifie si emp.site est un tableau
          ? emp.site
          : emp.site
            ? [emp.site]
            : ["Inconnu"];

        const joursTravailles = emp.joursDeTravail === 'Lundi-Vendredi' ? 5 : 6;
        const joursTravailles2 = emp.joursDeTravail2 === 'Lundi-Vendredi' ? 5 : 6;

        for (let day = 1; day <= daysInMonth; day++) {

          const currentDay = new Date(currentYear, month, day);
          const dayOfWeek = currentDay.getDay(); // 0 = Dimanche

          // ⏳ Filtrage jours travaillés — 1ère plage
          if (joursTravailles === 5 && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
          if (joursTravailles === 6 && dayOfWeek === 0) continue;

          // ⭐ PREMIÈRE PLAGE
          events.push({
            id: `${emp.codeSecret}-${month + 1}-${day}-1`,
            title: `${emp.prenom} ${emp.nom}`,
            start: this.combineDateAndTime(currentDay, emp.heureDebut),
            end: this.combineDateAndTime(currentDay, emp.heureFin),
            extendedProps: {
              codeEmploye: emp.codeSecret,
              intervention: emp.intervention,
              statut: emp.statut,
              site: siteList[0],        // ✔ plus jamais d'erreur
              employeCreePar: emp.employeCreePar,
              heureDebut: emp.heureDebut,
              heureFin: emp.heureFin,
              deplacement: emp.deplacement
            },
            color: emp.deplacement
              ? '#D10000'
              : emp.heureDebut === '06:00' && emp.heureFin === '19:00'
                ? '#7E00DE'
                : emp.heureDebut === '15:00' && emp.heureFin === '19:00'
                  ? '#F78F7C'
                  : '#545252'

          });

          // ⭐ DEUXIÈME PLAGE SI EXISTE
          if (emp.heureDebut2 && emp.heureFin2) {

            if (joursTravailles2 === 5 && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
            if (joursTravailles2 === 6 && dayOfWeek === 0) continue;

            events.push({
              id: `${emp.codeSecret}-${month + 1}-${day}-2`,
              title: `${emp.prenom} ${emp.nom}`,
              start: this.combineDateAndTime(currentDay, emp.heureDebut2),
              end: this.combineDateAndTime(currentDay, emp.heureFin2),
              extendedProps: {
                codeEmploye: emp.codeSecret,
                intervention: emp.intervention,
                statut: emp.statut,
                site: siteList[1] ?? siteList[0],   // ✔ sécurité + fallback
                employeCreePar: emp.employeCreePar,
                heureDebut2: emp.heureDebut2,
                heureFin2: emp.heureFin2,
                deplacement: emp.deplacement
              },
              color: emp.deplacement ? '#D10000' : '#FF9696'
            });
          }
        }

        this.changeMobileState(emp);
      });
    }

    return events;
  }




  /* generateWeeklyEvents(employes: Employe[]): EventInput[] {
     const events: EventInput[] = [];
     const today = new Date();
     const currentWeekMonday = this.getMonday(today);
 
     employes.forEach(emp => {
       const joursTravailles = emp.JoursDeTravail === 'Lundi-Vendredi' ? 5 : 6;
       
 
       for (let dayOffset = 0; dayOffset < joursTravailles; dayOffset++) {
         const currentDay = new Date(currentWeekMonday);
         currentDay.setDate(currentDay.getDate() + dayOffset);
 
         // Première plage horaire
         events.push({
           id: `${emp.codeSecret}-${dayOffset}-1`,
           title: `${emp.prenom} ${emp.nom}`,
           start: this.combineDateAndTime(currentDay, emp.heureDebut),
           end: this.combineDateAndTime(currentDay, emp.heureFin),
           extendedProps: {
             intervention: emp.intervention,
             statut: emp.statut,
             site: emp.site[0],
             employeCreePar: emp.employeCreePar,
             heureDebut: emp.heureDebut,
             heureFin: emp.heureFin
           },
           //color: emp.statut === 'Actif' ? '#4caf50' : '#f44336'
         });
 
         // Deuxième plage horaire si existe
         if (emp.heureDebut2 && emp.heureFin2) {
           events.push({
             id: `${emp.codeSecret}-${dayOffset}-2`,
             title: `${emp.prenom} ${emp.nom}`,
             start: this.combineDateAndTime(currentDay, emp.heureDebut2),
             end: this.combineDateAndTime(currentDay, emp.heureFin2),
             extendedProps: {
               intervention: emp.intervention,
               statut: emp.statut,
               site: emp.site[1],
               employeCreePar: emp.employeCreePar,
               heureDebut2: emp.heureDebut2,
               heureFin2: emp.heureFin2
             },
              color: '#F87C63'
           });
         }
       }
     });
 
     return events;
   }*/
}
