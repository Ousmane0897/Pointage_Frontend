import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';
import { ToastrService } from 'ngx-toastr';
import { PlanificationService } from '../../services/planification.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-super-admin',
    imports: [CommonModule],
    templateUrl: './super-admin.component.html',
    styleUrls: ['./super-admin.component.scss'] // ⚠ correction ici: styleUrls au pluriel
})
export class SuperAdminComponent implements OnInit, OnDestroy {

  private subs: Subscription[] = [];
  public pendingRequests: any[] = [];
  public currentRequest: any | null = null;
  public showValidationModal = false;

  // 🔔 Ajout de l'audio
  private audio = new Audio('assets/notification.wav');

  constructor(
    private ws: WebsocketService,
    private toastr: ToastrService,
    private planifService: PlanificationService
  ) { }

  ngOnInit(): void {
    // 1️⃣ Charger les demandes en attente depuis le backend
    this.planifService.getPendingRequests().subscribe(requests => {
      this.pendingRequests = requests;
    });

    // 2️⃣ Écouter les notifications en temps réel via WebSocket
    this.subs.push(
      this.ws.onAnnulationRequests().subscribe(req => {
        console.log('Nouvelle demande d\'annulation', req);
        this.pendingRequests.unshift(req); // ajouter en tête
        this.toastr.info(`${req.prenomNom} — ${req.motif}`, 'Nouvelle demande d\'annulation');
        this.playNotificationSound();
        //this.openValidationModal(req); // optionnel
      })
    );
  }


  // 🔔 Méthode pour jouer le son
  private playNotificationSound() {
    this.audio.currentTime = 0;
    this.audio.play().catch(err => console.error('Erreur lecture audio:', err));
  }

  openValidationModal(req: any) {
    this.currentRequest = req;
    this.showValidationModal = true;
  }

  closeValidationModal() {
    this.currentRequest = null;
    this.showValidationModal = false;
  }

  get pendingCount(): number {
    return this.pendingRequests.length;
  }

  openModal() {
    this.showValidationModal = true;
  }

  validate(accept: boolean, requestId: string) {
    this.planifService.validerAnnulation(requestId, accept).subscribe({
      next: () => {
        this.toastr.success(
          accept ? 'Annulation validée' : 'Annulation refusée',
          'Décision envoyée'
        );
        this.pendingRequests = this.pendingRequests.filter(r => r.planificationId !== requestId);
        if (this.currentRequest?.planificationId === requestId) { // Fermer le modal automatiquement si la demande courante a été validée/refusée
          this.closeValidationModal();
        }
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Erreur lors de la validation', 'Erreur');
      }
    });
  }


  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
