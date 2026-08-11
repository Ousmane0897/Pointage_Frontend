import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  SyntheseMensuelle,
  FiltreSynthese,
  SyntheseMultiMois,
  LigneSyntheseMulti,
  CelluleSyntheseMois,
} from '../models/stock-v2-synthese.model';

/**
 * Service de la Synthèse mensuelle — Module Stock v2 / 7.3.
 *
 * Agrège les mouvements d'un mois donné (stock initial / entrées / sorties /
 * stock final par produit) sur un périmètre site / catégorie.
 *
 * ⚠ L'endpoint serveur est **mono-mois** : la comparaison multi-mois est faite
 * côté client (un appel par mois via `forkJoin`, puis `fusionnerSyntheses`).
 * Il n'existe pas de paramètre `mois` répétable.
 */
@Injectable({ providedIn: 'root' })
export class StockV2SyntheseService {

  private baseUrl = `${environment.apiUrl}/stock/synthese-mensuelle`;

  constructor(private http: HttpClient) {}

  getSynthese(filtres: FiltreSynthese): Observable<SyntheseMensuelle> {
    let params = new HttpParams().set('mois', filtres.mois);
    if (filtres.siteId) params = params.set('siteId', filtres.siteId);
    if (filtres.categorieId) params = params.set('categorieId', filtres.categorieId);
    return this.http.get<SyntheseMensuelle>(this.baseUrl, { params });
  }

  /**
   * Synthèse comparée sur plusieurs mois : un appel serveur par mois, fusionné
   * côté client. Si un mois échoue, tout l'appel échoue (pas de résultat partiel).
   */
  getSyntheseMulti(mois: string[], siteId?: string, categorieId?: string): Observable<SyntheseMultiMois> {
    const moisTries = [...new Set(mois.filter(m => !!m))].sort();
    if (moisTries.length === 0) return of(syntheseMultiVide());
    return forkJoin(moisTries.map(m => this.getSynthese({ mois: m, siteId, categorieId })))
      .pipe(map(resultats => fusionnerSyntheses(moisTries, resultats)));
  }
}

export function syntheseMultiVide(): SyntheseMultiMois {
  return { mois: [], lignes: [], totauxParMois: [], totalEntrees: 0, totalSorties: 0, valeurStockFinal: 0 };
}

/**
 * Fusionne N synthèses mono-mois en une matrice produit × mois.
 *
 * `mois` et `resultats` sont alignés index par index. Un produit absent d'un mois
 * reçoit une cellule à zéro, pour que toutes les lignes aient le même nombre de
 * colonnes. Les stocks (initial / final / valeur) ne sont **jamais** sommés : la
 * ligne porte ceux du dernier mois.
 */
export function fusionnerSyntheses(mois: string[], resultats: SyntheseMensuelle[]): SyntheseMultiMois {
  if (mois.length === 0) return syntheseMultiVide();

  const parProduit = new Map<string, LigneSyntheseMulti>();

  mois.forEach((m, index) => {
    const synthese = resultats[index];
    (synthese?.lignes ?? []).forEach(l => {
      let ligne = parProduit.get(l.produitId);
      if (!ligne) {
        ligne = {
          produitId: l.produitId,
          produitCode: l.produitCode,
          produitLibelle: l.produitLibelle,
          unite: l.unite,
          categorieLibelle: l.categorieLibelle,
          parMois: mois.map(mm => celluleVide(mm)),
          totalEntrees: 0,
          totalSorties: 0,
          stockFinal: 0,
          valeurFinale: 0,
        };
        parProduit.set(l.produitId, ligne);
      }
      ligne.parMois[index] = {
        mois: m,
        stockInitial: l.stockInitial,
        entrees: l.entrees,
        sorties: l.sorties,
        stockFinal: l.stockFinal,
        valeurFinale: l.valeurFinale,
      };
    });
  });

  const dernierIndex = mois.length - 1;
  const lignes = [...parProduit.values()];
  lignes.forEach(ligne => {
    ligne.totalEntrees = ligne.parMois.reduce((s, c) => s + c.entrees, 0);
    ligne.totalSorties = ligne.parMois.reduce((s, c) => s + c.sorties, 0);
    ligne.stockFinal = ligne.parMois[dernierIndex].stockFinal;
    ligne.valeurFinale = ligne.parMois[dernierIndex].valeurFinale;
  });
  lignes.sort((a, b) => a.produitCode.localeCompare(b.produitCode, 'fr'));

  const totauxParMois = mois.map((m, index) => ({
    mois: m,
    entrees: resultats[index]?.totalEntrees ?? 0,
    sorties: resultats[index]?.totalSorties ?? 0,
    valeurStockFinal: resultats[index]?.valeurStockFinal ?? 0,
  }));

  const dernier = resultats[dernierIndex];

  return {
    mois,
    siteId: dernier?.siteId,
    siteNom: dernier?.siteNom,
    lignes,
    totauxParMois,
    totalEntrees: totauxParMois.reduce((s, t) => s + t.entrees, 0),
    totalSorties: totauxParMois.reduce((s, t) => s + t.sorties, 0),
    valeurStockFinal: dernier?.valeurStockFinal ?? 0,
  };
}

function celluleVide(mois: string): CelluleSyntheseMois {
  return { mois, stockInitial: 0, entrees: 0, sorties: 0, stockFinal: 0, valeurFinale: 0 };
}
