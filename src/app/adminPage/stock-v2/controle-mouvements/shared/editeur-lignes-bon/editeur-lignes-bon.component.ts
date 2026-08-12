import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { SelecteurProduitComponent } from '../../../stocks-approvisionnement/shared/selecteur-produit/selecteur-produit.component';
import { Produit } from '../../../../../models/stock-v2-produit.model';
import { StockV2EtatStockService } from '../../../../../services/stock-v2-etat-stock.service';
import { StockV2ConsommationService } from '../../../../../services/stock-v2-consommation.service';
import {
  LIBELLES_UNITE,
  DEVISE,
  PARAMETRES_CONTROLE_MOUVEMENTS,
  premierJourDuMois,
  dernierJourDuMois,
  formaterMois,
  formaterMoisCourt,
} from '../../../../../constants/stock.constants';

export type ModeStockLigne = 'AUCUN' | 'RESTE' | 'ACTUEL';

/** Crée un FormGroup de ligne de bon (produit + quantité + métadonnées d'affichage). */
export function creerLigneBon(data?: {
  produitId?: string;
  produitCode?: string;
  produitLibelle?: string;
  unite?: string;
  prixUnitaire?: number | null;
  quantite?: number | null;
}): FormGroup {
  return new FormGroup({
    produitId: new FormControl(data?.produitId ?? '', { nonNullable: true, validators: [Validators.required] }),
    produitCode: new FormControl(data?.produitCode ?? '', { nonNullable: true }),
    produitLibelle: new FormControl(data?.produitLibelle ?? '', { nonNullable: true }),
    unite: new FormControl(data?.unite ?? '', { nonNullable: true }),
    prixUnitaire: new FormControl<number | null>(data?.prixUnitaire ?? null),
    quantite: new FormControl<number | null>(data?.quantite ?? null, [Validators.required, Validators.min(0.0001)]),
  });
}

/**
 * Éditeur de lignes de bon — Module Stock v2 / 7.4.
 *
 * Manipule un `FormArray` fourni par le parent (formulaire bon entrée/sortie).
 * Chaque ligne réutilise le `SelecteurProduitComponent` de 7.3. Le parent ne
 * transmet au serveur que { produitId, quantite } ; les autres champs servent à
 * l'affichage et au calcul du montant.
 *
 * Les deux formulaires activent en plus une colonne de stock (`modeStock`) :
 * « Reste » (sortie : stock du `siteId` − quantité saisie) ou « Stock actuel »
 * (entrée : stock en l'état). Purement indicatif — le refus pour stock
 * insuffisant reste une règle serveur, appliquée à la validation du bon.
 */
@Component({
  selector: 'app-editeur-lignes-bon',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, SelecteurProduitComponent],
  templateUrl: './editeur-lignes-bon.component.html',
  styleUrl: './editeur-lignes-bon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditeurLignesBonComponent implements OnChanges, OnDestroy {

  @Input({ required: true }) lignes!: FormArray;
  /**
   * Colonne de stock : `'RESTE'` (bon de sortie — stock − quantité saisie),
   * `'ACTUEL'` (bon d'entrée — stock en l'état) ou `'AUCUN'`.
   *
   * Un mode unique plutôt que deux booléens : il n'existe ainsi aucun état
   * impossible du type « colonne masquée mais mode de calcul renseigné ».
   */
  @Input() modeStock: ModeStockLigne = 'AUCUN';
  /** Site détenteur du stock : `siteSourceId` en sortie, `siteDestinationId` en entrée. */
  @Input() siteId: string | null = null;
  /**
   * Colonne « Sorties / 3 derniers mois » — bon de sortie uniquement.
   *
   * Booléen distinct de `modeStock` : cette colonne est **orthogonale** au mode de
   * calcul du stock, elle n'en est pas une variante d'affichage.
   */
  @Input() afficherSorties3Mois = false;

  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly DEVISE = DEVISE;

  /** Stock disponible par produitId. Clé produit (et non index) : l'index se décale à la suppression. */
  private stocks = new Map<string, number | null>();
  private stocksEnCours = new Set<string>();

  /**
   * Sorties du site par produitId, ventilées par mois (`yyyy-MM` → quantité).
   *
   * `null` = valeur inconnue (appel échoué) ; une `Map` vide = appel réussi sans
   * aucun mouvement. Les deux ne s'affichent pas pareil.
   */
  private sorties = new Map<string, Map<string, number> | null>();
  private sortiesEnCours = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(
    private etatStockService: StockV2EtatStockService,
    private consommationService: StockV2ConsommationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['siteId'] && !changes['modeStock'] && !changes['afficherSorties3Mois']) return;
    // Les deux données dépendent du site : tout changement de périmètre invalide les caches.
    this.stocks.clear();
    this.stocksEnCours.clear();
    this.sorties.clear();
    this.sortiesEnCours.clear();
    // Couvre l'ouverture d'un brouillon existant, dont les lignes ne passent pas par onProduit().
    for (const g of this.groupes) {
      const produitId = g.get('produitId')?.value;
      this.chargerStock(produitId);
      this.chargerSorties(produitId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get groupes(): FormGroup[] {
    return this.lignes.controls as FormGroup[];
  }

  ajouter(): void {
    this.lignes.push(creerLigneBon());
    this.cdr.markForCheck();
  }

  supprimer(i: number): void {
    this.lignes.removeAt(i);
    this.cdr.markForCheck();
  }

  onProduit(i: number, p: Produit): void {
    this.groupes[i].patchValue({
      produitId: p.id ?? '',
      produitCode: p.code,
      produitLibelle: p.libelle,
      unite: p.unite,
      prixUnitaire: p.prixUnitaire ?? null,
    }, { emitEvent: false });
    // ⚠ Ne pas utiliser p.quantiteTotale : c'est un cumul tous sites, pas le stock du site source.
    this.chargerStock(p.id);
    this.chargerSorties(p.id);
    this.cdr.markForCheck();
  }

  // ─── Colonne de stock ─────────────────────────────────────────────────────

  get afficheStock(): boolean {
    return this.modeStock !== 'AUCUN';
  }

  get libelleColonneStock(): string {
    return this.modeStock === 'ACTUEL' ? 'Stock actuel' : 'Reste';
  }

  private chargerStock(produitId?: string | null): void {
    if (!this.afficheStock || !produitId) return;
    if (this.stocks.has(produitId) || this.stocksEnCours.has(produitId)) return;
    this.stocksEnCours.add(produitId);
    this.etatStockService.getEtatProduit(produitId, this.siteId ?? undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe(etat => {
        this.stocksEnCours.delete(produitId);
        this.stocks.set(produitId, etat?.quantite ?? null);
        this.cdr.markForCheck();
      });
  }

  stockDisponible(g: FormGroup): number | null {
    const produitId = g.get('produitId')?.value as string;
    if (!produitId) return null;
    return this.stocks.get(produitId) ?? null;
  }

  /** Stock en l'état en mode `ACTUEL`, diminué de la quantité saisie en mode `RESTE`. */
  valeurStock(g: FormGroup): number | null {
    const stock = this.stockDisponible(g);
    if (stock === null) return null;
    if (this.modeStock === 'ACTUEL') return stock;
    return stock - (Number(g.get('quantite')?.value) || 0);
  }

  /** « — » tant que le stock est inconnu : un 0 se lirait à tort comme une rupture. */
  valeurAffichee(g: FormGroup): string {
    const valeur = this.valeurStock(g);
    return valeur === null ? '—' : valeur.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }

  infobulleStock(g: FormGroup): string {
    const stock = this.stockDisponible(g);
    if (stock === null) return 'Stock indisponible pour ce site.';
    if (this.modeStock === 'ACTUEL') return `Stock du site avant réception : ${stock}`;
    const quantite = Number(g.get('quantite')?.value) || 0;
    return `Stock du site : ${stock} − quantité saisie : ${quantite}`;
  }

  // ─── Colonnes « sorties » mensuelles ──────────────────────────────────────

  readonly formaterMoisCourt = formaterMoisCourt;

  /**
   * Les N derniers mois **complets** (`yyyy-MM`), du plus ancien au plus récent —
   * le mois en cours, partiel, est exclu : en août 2026 → mai, juin, juillet.
   *
   * Sert à la fois aux en-têtes et aux cellules, ce qui garantit leur alignement.
   * Dates construites en local, jamais via `toISOString()`.
   */
  get moisSorties(): string[] {
    const n = PARAMETRES_CONTROLE_MOUVEMENTS.moisHistoriqueSorties;
    const now = new Date();
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - n + i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  }

  private chargerSorties(produitId?: string | null): void {
    if (!this.afficherSorties3Mois || !produitId) return;
    // ⚠ Le chiffre ne vaut que pour CE site : sans site choisi, on n'appelle pas.
    if (!this.siteId) return;
    if (this.sorties.has(produitId) || this.sortiesEnCours.has(produitId)) return;
    this.sortiesEnCours.add(produitId);
    const mois = this.moisSorties;
    this.consommationService.rapport({
      // PAR_PERIODE : une ligne par mois (⚠ contrat serveur : `cle` = 'yyyy-MM').
      type: 'PAR_PERIODE',
      dateDebut: premierJourDuMois(mois[0]),
      dateFin: dernierJourDuMois(mois[mois.length - 1]),
      produitId,
      siteId: this.siteId,
    })
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe(rapport => {
        this.sortiesEnCours.delete(produitId);
        this.sorties.set(
          produitId,
          rapport ? new Map(rapport.lignes.map(l => [l.cle, l.quantite])) : null,
        );
        this.cdr.markForCheck();
      });
  }

  /** `null` = inconnu (produit/site non choisi ou appel échoué) ; `0` = mois sans sortie. */
  sortieDuMois(g: FormGroup, mois: string): number | null {
    const produitId = g.get('produitId')?.value as string;
    if (!produitId) return null;
    const parMois = this.sorties.get(produitId);
    if (!parMois) return null;
    return parMois.get(mois) ?? 0;
  }

  sortieAffichee(g: FormGroup, mois: string): string {
    const valeur = this.sortieDuMois(g, mois);
    return valeur === null ? '—' : valeur.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }

  infobulleSorties(g: FormGroup, mois: string): string {
    if (!this.siteId) return 'Sélectionnez d’abord le site source.';
    if (this.sortieDuMois(g, mois) === null) return `Sorties de ${formaterMois(mois)} indisponibles.`;
    return `Sorties de ce site en ${formaterMois(mois)}`;
  }

  /** Produit · Quantité · Unité, plus les colonnes optionnelles, avant le montant. */
  get colspanTotal(): number {
    return 3
      + (this.afficheStock ? 1 : 0)
      + (this.afficherSorties3Mois ? this.moisSorties.length : 0);
  }

  montantLigne(g: FormGroup): number {
    const q = Number(g.get('quantite')?.value) || 0;
    const pu = Number(g.get('prixUnitaire')?.value) || 0;
    return q * pu;
  }

  total(): number {
    return this.groupes.reduce((s, g) => s + this.montantLigne(g), 0);
  }

  uniteLigne(g: FormGroup): string {
    const u = g.get('unite')?.value as keyof typeof LIBELLES_UNITE | '';
    return u ? (LIBELLES_UNITE[u] ?? '') : '';
  }

  trackByIndex(i: number): number {
    return i;
  }
}
