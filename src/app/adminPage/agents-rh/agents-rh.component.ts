import { Component, OnInit } from '@angular/core';
import { EmployeCompletService } from '../../services/employe-complet.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EmployeComplet } from '../../models/employe-complet.model';
import { catchError, of, Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-agents-rh',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './agents-rh.component.html',
  styleUrl: './agents-rh.component.scss'
})
export class AgentsRhComponent implements OnInit {


  private destroy$ = new Subject<void>(); // Sujet pour gérer la désinscription des observables et éviter les fuites de mémoire.


  // 🔍 Recherche
  searchTerm: string = '';

  // 📑 Pagination
  pageSize: number = 10;
  currentPage: number = 0;
  total = 0;
  totalPages: number = 0;
  loading: boolean = false;
  errorMessage: string = '';
  employeComplet: EmployeComplet[] = [];
  searchQuery = '';
  baseUrl: string = environment.apiUrlEmploye;

  selectedEmployee: any = null;
  modalOpen = false;

  drawerOpen = false;
  activeSection: 'personnel' | 'contrat' | 'sante' | 'famille' | null = null;
  editMode = false;

  drawerPosition: 'left' | 'right' = 'right';

  drawerX = 0;
  drawerY = 0;

  DRAWER_WIDTH = 520;
  DRAWER_HEIGHT = 420;


  employeeForm!: FormGroup;


  // 🪪 Hover
  hoveredEmployee: EmployeComplet | null = null;


  constructor(private employeService: EmployeCompletService, private toastr: ToastrService,
    private fb: FormBuilder

  ) { }



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

  ngOnInit(): void {

    this.loadEmployes();
  }

  openModal(emp: any) {
    this.selectedEmployee = emp;
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.selectedEmployee = null;
  }

  onSectionClick(section: string) {
    console.log('Section cliquée:', section);
    // plus tard : navigation, autre modal, drawer, etc.
  }


  openSection(section: any, event: MouseEvent) {
    this.activeSection = section;
    this.drawerOpen = true;
    this.editMode = false;

    this.buildForm(section);

    const clickX = event.clientX;
    const clickY = event.clientY;
    const screenWidth = window.innerWidth;

    // Déterminer gauche / droite
    if (screenWidth - clickX > this.DRAWER_WIDTH + 40) {
      this.drawerPosition = 'right';
      this.drawerX = clickX + 20;
    } else {
      this.drawerPosition = 'left';
      this.drawerX = clickX - this.DRAWER_WIDTH - 20;
    }

    // Position verticale (empêcher débordement)
    this.drawerY = Math.min(
      clickY,
      window.innerHeight - this.DRAWER_HEIGHT - 20
    );
  }


  closeDrawer() {
    this.drawerOpen = false;
    this.activeSection = null;
    this.editMode = false;
  }

  buildForm(section: string) {
    const emp = this.selectedEmployee;

    switch (section) {

      case 'personnel':
        this.employeeForm = this.fb.group({
          prenom: [emp?.prenom],
          nom: [emp?.nom],
          email: [emp?.email],
          telephone1: [emp?.telephone1],
          adresse: [emp?.adresse],
        });
        break;

      case 'contrat':
        this.employeeForm = this.fb.group({
          typeContrat: [emp?.typeContrat],
          dateEmbauche: [emp?.dateEmbauche],
          statut: [emp?.statut],
          heureDebut: [emp?.heureDebut],
          heureFin: [emp?.heureFin],
        });
        break;

      case 'sante':
        this.employeeForm = this.fb.group({
          assurance: [emp?.assurance],
          mutuelle: [emp?.mutuelle],
          groupeSanguin: [emp?.groupeSanguin],
          contactUrgence: [emp?.contactUrgence],
        });
        break;

      case 'famille':
        this.employeeForm = this.fb.group({
          situationFamiliale: [emp?.situationFamiliale],
          nombreEnfants: [emp?.nombreEnfants],
          nomConjoint: [emp?.nomConjoint],
        });
        break;
    }
  }

  saveSection() {
    if (this.employeeForm.invalid) return;

    const payload = {
      ...this.employeeForm.value,
      section: this.activeSection
    };

    console.log('Payload à envoyer:', payload);

    // 🔜 API Spring Boot
    // this.employeService.updateSection(this.selectedEmployee.id, payload).subscribe(...)
  }

  getSectionTitle(): string {
    switch (this.activeSection) {
      case 'personnel':
        return 'Informations Personnelles';
      case 'contrat':
        return 'Détails du Contrat';
      case 'sante':
        return 'Informations de Santé';
      case 'famille':
        return 'Informations Familiales';
      default:
        return '';
    }
  }

  private hideTimeout: any = null;


  mouseX = 0;
  mouseY = 0;

  tooltipVisible = false;

  private overRow = false;
  private overCard = false;


  // Ce code sert à positionner dynamiquement une carte / tooltip / panneau 
  // près de la souris sans qu’il sorte de l’écran.
  /*
       window.innerWidth → largeur totale de l’écran.
       mouseX → position horizontale actuelle de la souris.
       cardWidth → largeur de la carte
       offsetX → petit espace entre la souris et la carte (ex: 10px)
  */
  onRowEnter(emp: EmployeComplet, event: MouseEvent) {
    this.hoveredEmployee = emp;
    this.overRow = true;

    const offsetX = 16;
    const cardWidth = 320;
    const cardHeight = 260;

    const mouseX = event.clientX;
    const mouseY = event.clientY;

    // 👉 Alignement horizontal (gauche ou droite)
    const spaceRight = window.innerWidth - mouseX; // Espace disponible à droite de la souris
    const openRight = spaceRight > cardWidth + offsetX; // Suffisamment d'espace à droite ?

    this.mouseX = openRight // 
      ? mouseX + offsetX               // Assez de place à droite, la carte s'ouvre à droite du curseur
      : mouseX - cardWidth - offsetX;  // Assez de place à gauche, la carte s'ouvre à gauche du curseur

    // 👉 Alignement vertical (ni haut ni bas)
    this.mouseY = Math.min(
      Math.max(mouseY - cardHeight / 2, 8),
      window.innerHeight - cardHeight - 8
    );

    this.tooltipVisible = true;
  }



  onMouseMove(event: MouseEvent) {
    const offset = 16;
    this.mouseX = Math.min(event.clientX + offset, window.innerWidth - 320);
    this.mouseY = Math.min(event.clientY + offset, window.innerHeight - 220);
  }

  onRowLeave() {
    this.overRow = false;

    this.hideTimeout = setTimeout(() => {
      this.tryHideTooltip();
    }, 120); // 👈 tolérance humaine naturelle
  }


  onCardEnter() {
    this.overCard = true;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }


  onCardLeave() {
    this.overCard = false;
    this.tryHideTooltip();
  }

  private tryHideTooltip() {
    if (!this.overRow && !this.overCard) {
      this.tooltipVisible = false;
      this.hoveredEmployee = null;
    }
  }


  // ===============================
  // 🔍 FILTRAGE
  // ===============================
  get filteredEmployees(): EmployeComplet[] {

    if (!this.employeComplet?.length) return [];

    if (!this.searchTerm) {
      return this.employeComplet;
    }

    const term = this.searchTerm.toLowerCase();

    return this.employeComplet.filter(emp =>
      emp.prenom.toLowerCase().includes(term) ||
      emp.nom.toLowerCase().includes(term) ||
      emp.poste.toLowerCase().includes(term)
    );
  }

  // ===============================
  // 📥 CHARGEMENT DES EMPLOYÉS
  // ===============================

  loadEmployes(): void {
    this.loading = true;
    this.errorMessage = '';
    this.employeService
      .getEmployesComplet(this.currentPage, this.pageSize, this.searchQuery)
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
        this.totalPages = Math.ceil(this.total / this.pageSize);
        this.loading = false;
      });
  }

  nextPage(): void {
    if (this.currentPage + 1 < this.totalPages) {
      this.currentPage++;
      this.loadEmployes();
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadEmployes();
    }
  }


  // 🔄 Reset page when searching
  ngOnChanges(): void {
    this.currentPage = 1;
  }

  // 🧹 Nettoyage des abonnements. 
  ngOnDestroy(): void {
    this.destroy$.next(); // Signale la fin des abonnements dès que le composant est détruit.  interrompt toutes les souscriptions liées. Émet un signal pour dire “stoppez toutes les souscriptions actives”.
    this.destroy$.complete(); // Termine le Subject pour libérer les ressources.
  }
}



