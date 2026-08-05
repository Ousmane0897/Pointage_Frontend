import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CompteursAValider,
  CreationDemandePayload,
  DemandeConge,
  FiltreConge,
  MonProfilConge,
  NiveauValidation,
  SoldeConge,
} from '../models/conge.model';
import { PageResponse } from '../models/pageResponse.model';

/**
 * Service pour les demandes de congé et soldes.
 *
 * Circuit de validation à 3 niveaux :
 *   EN_ATTENTE_SUPERIEUR → EN_ATTENTE_RH → EN_ATTENTE_DG → APPROUVE
 * (refus terminal à n'importe quel niveau, motif obligatoire).
 *
 * ⚠ Le **niveau n'est jamais transmis** par le client sur `/valider` et
 * `/refuser` : le serveur le déduit du statut courant et vérifie que l'appelant
 * est habilité à ce niveau (403 sinon, 409 si la demande a déjà été traitée).
 */
@Injectable({ providedIn: 'root' })
export class CongeService {

  private baseUrl = environment.apiUrl;

  /** Cache du profil métier de l'appelant (une seule résolution par session). */
  private monProfil$?: Observable<MonProfilConge>;

  constructor(private http: HttpClient) {}

  // ─── Identité ─────────────────────────────────────────────────────────────

  /**
   * Profil métier de l'utilisateur connecté, résolu serveur depuis l'e-mail du
   * JWT — celui-ci ne portant ni `id` ni `employeId`, c'est le seul moyen de
   * savoir « qui suis-je » et « de qui suis-je le supérieur ».
   */
  getMonProfil(): Observable<MonProfilConge> {
    if (!this.monProfil$) {
      this.monProfil$ = this.http.get<MonProfilConge>(
        `${this.baseUrl}/temps-presences/conges/moi`,
      ).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.monProfil$;
  }

  /** Invalide le cache puis recharge (changement de compte, droits modifiés). */
  rafraichirMonProfil(): Observable<MonProfilConge> {
    this.monProfil$ = undefined;
    return this.getMonProfil();
  }

  // ─── Soldes ───────────────────────────────────────────────────────────────
  getSoldes(employeId?: string): Observable<SoldeConge[]> {
    let params = new HttpParams();
    if (employeId) params = params.set('employeId', employeId);
    return this.http.get<SoldeConge[]>(
      `${this.baseUrl}/temps-presences/conges/soldes`,
      { params },
    );
  }

  getSoldeEmploye(employeId: string): Observable<SoldeConge> {
    return this.http.get<SoldeConge>(
      `${this.baseUrl}/temps-presences/conges/soldes/${employeId}`,
    );
  }

  // ─── Demandes ─────────────────────────────────────────────────────────────
  listerDemandes(
    page = 0,
    size = 10,
    filtres?: FiltreConge,
  ): Observable<PageResponse<DemandeConge>> {
    return this.http.get<PageResponse<DemandeConge>>(
      `${this.baseUrl}/temps-presences/conges/demandes`,
      { params: this.construireParams(page, size, filtres) },
    );
  }

  /** Demandes de l'utilisateur connecté (demandeur déduit du JWT). */
  mesDemandes(
    page = 0,
    size = 10,
    filtres?: FiltreConge,
  ): Observable<PageResponse<DemandeConge>> {
    return this.http.get<PageResponse<DemandeConge>>(
      `${this.baseUrl}/temps-presences/conges/demandes/mes-demandes`,
      { params: this.construireParams(page, size, filtres) },
    );
  }

  /**
   * File de validation : le serveur ne renvoie que ce que l'appelant peut
   * trancher **maintenant** (subordonnés directs pour le niveau supérieur, file
   * RH, file Direction), avec `peutValiderParMoi = true` sur chaque ligne.
   */
  demandesAValider(
    page = 0,
    size = 10,
    niveau?: NiveauValidation,
  ): Observable<PageResponse<DemandeConge>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (niveau) params = params.set('niveau', niveau);
    return this.http.get<PageResponse<DemandeConge>>(
      `${this.baseUrl}/temps-presences/conges/demandes/a-valider`,
      { params },
    );
  }

  /** Compteurs de la file de validation, par niveau, pour les onglets. */
  compterAValider(): Observable<CompteursAValider> {
    return this.http.get<CompteursAValider>(
      `${this.baseUrl}/temps-presences/conges/demandes/a-valider/compteurs`,
    );
  }

  getDemandeById(id: string): Observable<DemandeConge> {
    return this.http.get<DemandeConge>(
      `${this.baseUrl}/temps-presences/conges/demandes/${id}`,
    );
  }

  /**
   * Crée une demande. `employeId` omis ⇒ le serveur prend le demandeur du JWT ;
   * fourni ⇒ réservé aux profils RH / SUPERADMIN (403 sinon). Le statut initial
   * est posé par le serveur, jamais par le client.
   */
  creerDemande(payload: CreationDemandePayload): Observable<DemandeConge> {
    return this.http.post<DemandeConge>(
      `${this.baseUrl}/temps-presences/conges/demandes`,
      payload,
    ).pipe(tap(() => this.invaliderProfil()));
  }

  modifierDemande(id: string, demande: DemandeConge): Observable<DemandeConge> {
    return this.http.put<DemandeConge>(
      `${this.baseUrl}/temps-presences/conges/demandes/${id}`,
      demande,
    );
  }

  annulerDemande(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/temps-presences/conges/demandes/${id}`,
    ).pipe(tap(() => this.invaliderProfil()));
  }

  // ─── Transitions du circuit ───────────────────────────────────────────────

  /**
   * Fait avancer la demande d'un cran. Le niveau est déduit serveur du statut
   * courant et de l'identité de l'appelant.
   */
  valider(id: string, commentaire?: string): Observable<DemandeConge> {
    return this.http.post<DemandeConge>(
      `${this.baseUrl}/temps-presences/conges/demandes/${id}/valider`,
      { commentaire },
    ).pipe(tap(() => this.invaliderProfil()));
  }

  /** Refus terminal — motif obligatoire (422 côté serveur s'il est trop court). */
  refuser(id: string, motif: string): Observable<DemandeConge> {
    return this.http.post<DemandeConge>(
      `${this.baseUrl}/temps-presences/conges/demandes/${id}/refuser`,
      { motif },
    ).pipe(tap(() => this.invaliderProfil()));
  }

  /** @deprecated remplacé par `valider()` — conservé le temps de la bascule backend. */
  approuver(id: string, commentaire?: string): Observable<DemandeConge> {
    return this.valider(id, commentaire);
  }

  // ─── Interne ──────────────────────────────────────────────────────────────

  private construireParams(
    page: number,
    size: number,
    filtres?: FiltreConge,
  ): HttpParams {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filtres?.employeId) params = params.set('employeId', filtres.employeId);
    if (filtres?.departement) params = params.set('departement', filtres.departement);
    if (filtres?.statut) params = params.set('statut', filtres.statut);
    // Multi-statuts : le param `statut` est répété (Spring lie une List<String>).
    filtres?.statuts?.forEach(s => (params = params.append('statut', s)));
    if (filtres?.niveau) params = params.set('niveau', filtres.niveau);
    if (filtres?.type) params = params.set('type', filtres.type);
    if (filtres?.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres?.dateFin) params = params.set('dateFin', filtres.dateFin);
    if (filtres?.q) params = params.set('q', filtres.q);

    return params;
  }

  /** Le compteur `nbDemandesAValider` du profil devient faux après une écriture. */
  private invaliderProfil(): void {
    this.monProfil$ = undefined;
  }
}
