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

@Component({
  selector: 'app-calendar-employes',
  standalone: true,
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
  modalData: Planification = {
    prenomNom:'',
    codeSecret: '',
    nomSite: '',
    siteDestination: '',
    dateDebut: '',
    dateFin: '',
    heureDebut: '',
    heureFin: '',
    statut: '',
    commentaires: '',
    dateCreation: ''
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
    hiddenDays: [0], // dimanche
    events: [],
    eventClick: this.handleEventClick.bind(this),
    eventDrop: this.handleEventChange.bind(this),
    eventResize: this.handleEventChange.bind(this)
  };

  constructor(private employesService: EmployeService, private agence: AgencesService,
    private planification: PlanificationService, private toastr: ToastrService
  ) { }

  ngOnInit() {
    this.employesService.getEmployes().subscribe((data: Employe[]) => {
      const events = this.generateWeeklyEvents(data);
      this.events = events;
      this.applyFilter();
      this.getAvailableSites();
    });
  }

  getPlanificationByCodeEmploye(codeEmploye: string): Planification {

    this.planification.getPlanificationByCodeEmploye(codeEmploye).subscribe(data => {
      this.getPlanification = data;
    })
    return this.getPlanification;
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
  
        this.planification.addPlanification(this.modalData).subscribe(() => {
          this.employesService.getEmployeByCodeEmploye(this.modalData.codeSecret).subscribe(employe => {
            this.getEmployeByCodeSecret = employe;
          });
          this.employesService.updateEmployeEnDeplacement(this.modalData.codeSecret,this.getEmployeByCodeSecret); // Seulemement en guise de test mais la méthode 'updateEmployeEnDeplacement' doit etre exécutée le jour de départ de l'employé pour etre logique.
          this.closeModal();
          this.toastr.success('Planification ajoutée avec succès !', 'Succès');
  
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
    this.modalData = { prenomNom: this.selectedEmploye.name, codeSecret: '', nomSite: this.selectedEmploye.departement, siteDestination: '', dateDebut: '', dateFin: '', heureDebut: '', heureFin: '', statut: '', commentaires: null, dateCreation: '' };
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
    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.getFilteredEvents()
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
      end: event.end
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

  generateWeeklyEvents(employes: Employe[]): EventInput[] {
    const events: EventInput[] = [];
    const today = new Date();
    const currentWeekMonday = this.getMonday(today);

    employes.forEach(emp => {
      const joursTravailles = emp.joursDeTravail === 'Lundi-Vendredi' ? 5 : 6;
      const joursTravailles2 = emp.joursDeTravail2 === 'Lundi-Vendredi' ? 5 : 6;


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
            codeEmploye: emp.codeSecret,
            intervention: emp.intervention,
            statut: emp.statut,
            site: emp.site[0],
            employeCreePar: emp.employeCreePar,
            heureDebut: emp.heureDebut,
            heureFin: emp.heureFin
          },
           color: emp.deplacement ? '#F1F500' : '#0086FF'
        });
      }

      for (let dayOffset = 0; dayOffset < joursTravailles2; dayOffset++) {
        const currentDay = new Date(currentWeekMonday);
        currentDay.setDate(currentDay.getDate() + dayOffset);


        // Deuxième plage horaire si existe
        if (emp.heureDebut2 && emp.heureFin2) {
          events.push({
            id: `${emp.codeSecret}-${dayOffset}-2`,
            title: `${emp.prenom} ${emp.nom}`,
            start: this.combineDateAndTime(currentDay, emp.heureDebut2),
            end: this.combineDateAndTime(currentDay, emp.heureFin2),
            extendedProps: {
              codeEmploye: emp.codeSecret,
              intervention: emp.intervention,
              statut: emp.statut,
              site: emp.site[1],
              employeCreePar: emp.employeCreePar,
              heureDebut2: emp.heureDebut2,
              heureFin2: emp.heureFin2
            },
             color: emp.deplacement ? '#F1F500' : '#F87C63'
          });
        }
      }
    });

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
