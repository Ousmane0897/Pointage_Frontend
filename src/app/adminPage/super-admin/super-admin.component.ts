import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';
import { ToastrService } from 'ngx-toastr';
import { PlanificationService } from '../../services/planification.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [
    CommonModule,
    
  ],
  templateUrl: './super-admin.component.html',
  styleUrl: './super-admin.component.scss'
})
export class SuperAdminComponent implements OnInit, OnDestroy {

  private subs: Subscription[] = [];
  public pendingRequests: any[] = [];
  public currentRequest: any | null = null;
  public showValidationModal = false;

  constructor(
    private ws: WebsocketService,
    private toastr: ToastrService,
    private planifService: PlanificationService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.ws.onAnnulationRequests().subscribe(req => {
        console.log('Nouvelle demande d\'annulation', req);
        this.pendingRequests.unshift(req);
        this.toastr.info(`${req.prenomNom} — ${req.motif}`, 'Nouvelle demande d\'annulation');
        // auto open modal (optionnel)
        this.openValidationModal(req);
      })
    );

    this.subs.push(
      this.ws.onAnnulationDecisions().subscribe(dec => {
        console.log('Decision broadcast', dec);
        // mettre à jour UI si besoin
      })
    );
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

  validate(accept: boolean) {
    if (!this.currentRequest) return;
    this.planifService.validerAnnulation(this.currentRequest.planificationId, accept).subscribe({
      next: (res) => {
        this.toastr.success(accept ? 'Annulation validée' : 'Annulation refusée', 'Decision envoyée');
        // retirer de pending
        this.pendingRequests = this.pendingRequests.filter(r => r.planificationId !== this.currentRequest.planificationId);
        this.closeValidationModal();
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