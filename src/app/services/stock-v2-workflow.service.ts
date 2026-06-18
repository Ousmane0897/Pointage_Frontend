import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  BonWorkflow,
  DecisionWorkflowPayload,
  SensBon,
  StatutBon,
} from '../models/stock-v2-workflow.model';
import { BonEntree } from '../models/stock-v2-bon-entree.model';
import { BonSortie } from '../models/stock-v2-bon-sortie.model';
import { StockV2BonEntreeService } from './stock-v2-bon-entree.service';
import { StockV2BonSortieService } from './stock-v2-bon-sortie.service';

/**
 * Service du Workflow de validation — Module Stock v2 / 7.4.
 *
 * Agrège les bons d'entrée et de sortie dans une vue unifiée (tableau Kanban)
 * et délègue les transitions aux services dédiés selon le sens du bon. Les
 * notifications temps réel passent par `WebsocketService.onStockValidations()`.
 */
@Injectable({ providedIn: 'root' })
export class StockV2WorkflowService {

  private baseUrl = `${environment.apiUrl}/stock/workflow`;

  constructor(
    private http: HttpClient,
    private bonEntree: StockV2BonEntreeService,
    private bonSortie: StockV2BonSortieService,
  ) {}

  /** Liste unifiée des bons (entrée + sortie) pour le Kanban de workflow. */
  listerBons(filtres?: { statut?: StatutBon; sens?: SensBon; q?: string }): Observable<BonWorkflow[]> {
    let params = new HttpParams();
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    if (filtres?.sens) params = params.set('sens', filtres.sens);
    if (filtres?.q) params = params.set('q', filtres.q);
    return this.http.get<BonWorkflow[]>(`${this.baseUrl}/bons`, { params });
  }

  // ─── Transitions déléguées selon le sens ──────────────────────────────────

  soumettre(sens: SensBon, id: string): Observable<BonEntree | BonSortie> {
    return sens === 'ENTREE' ? this.bonEntree.soumettre(id) : this.bonSortie.soumettre(id);
  }

  valider(sens: SensBon, id: string, payload?: DecisionWorkflowPayload): Observable<BonEntree | BonSortie> {
    return sens === 'ENTREE' ? this.bonEntree.valider(id, payload) : this.bonSortie.valider(id, payload);
  }

  refuser(sens: SensBon, id: string, payload: DecisionWorkflowPayload): Observable<BonEntree | BonSortie> {
    return sens === 'ENTREE' ? this.bonEntree.refuser(id, payload) : this.bonSortie.refuser(id, payload);
  }
}
