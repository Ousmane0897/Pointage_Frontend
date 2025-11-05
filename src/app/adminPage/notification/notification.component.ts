import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';

@Component({
    selector: 'app-notification',
    imports: [],
    templateUrl: './notification.component.html',
    styleUrl: './notification.component.scss'
})

export class NotificationComponent implements OnInit, OnDestroy {
  pendingRequests: any[] = [];
  pendingCount = 0;
  showValidationModal = false;

  private audio = new Audio('assets/notification.wav');
  private subs: Subscription[] = [];

  constructor(private wsService: WebsocketService) {}

  ngOnInit() {
    // 🔹 Écoute uniquement les nouvelles demandes d’annulation
    this.subs.push(
      this.wsService.onAnnulationRequests().subscribe((request) => {
        const exists = this.pendingRequests.some(r => r.id === request.id);

        if (!exists) {
          this.pendingRequests.push(request);
          this.pendingCount = this.pendingRequests.length;

          this.playNotificationSound();
        }
      })
    );

    // 🔹 Tu peux aussi écouter les décisions si besoin
    this.subs.push(
      this.wsService.onAnnulationDecisions().subscribe((decision) => {
        console.log('Décision reçue:', decision);
        // TODO: mettre à jour l’UI si nécessaire
      })
    );

    // 🔹 Et les réponses perso si besoin
    this.subs.push(
      this.wsService.onAnnulationResponses().subscribe((response) => {
        console.log('Réponse reçue:', response);
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  playNotificationSound() {
    this.audio.currentTime = 0;
    this.audio.play().catch(err => {
      console.warn('Audio bloqué par le navigateur', err);
    });
  }

  openModal() {
    this.showValidationModal = true;
  }

  closeValidationModal() {
    this.showValidationModal = false;
  }

  validate(accepted: boolean, requestId: string) {
    console.log('Validation:', accepted, 'pour la demande', requestId);

    // 🔹 Supprime la demande de la liste après validation
    this.pendingRequests = this.pendingRequests.filter(r => r.id !== requestId);
    this.pendingCount = this.pendingRequests.length;

    // TODO: appel API backend POST /api/planification/valider
  }
}