import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

import { Produit } from '../models/stock-v2-produit.model';
import { MouvementStock } from '../models/stock-v2-mouvement.model';
import { EtatStock } from '../models/stock-v2-etat-stock.model';
import { SyntheseMensuelle } from '../models/stock-v2-synthese.model';
import { RapportTableauBordStock } from '../models/stock-v2-tableau-bord.model';
import {
  LIBELLES_TYPE_PRODUIT,
  LIBELLES_UNITE,
  LIBELLES_TYPE_MOUVEMENT,
  LIBELLES_MOTIF_MOUVEMENT,
  LIBELLES_STATUT_STOCK,
} from '../constants/stock.constants';

/**
 * Service d'export Excel (XLSX) — Module Stock v2 / 7.3.
 *
 * Centralise tous les exports tabulaires du module (catalogue, mouvements,
 * état du stock, synthèse mensuelle, tableau de bord).
 */
@Injectable({ providedIn: 'root' })
export class StockV2ExportService {

  exporterProduits(produits: Produit[]): void {
    const rows = produits.map(p => ({
      Code: p.code,
      Libellé: p.libelle,
      Type: LIBELLES_TYPE_PRODUIT[p.typeProduit],
      Catégorie: p.categorieLibelle ?? '',
      'Sous-catégorie': p.sousCategorie ?? '',
      Unité: LIBELLES_UNITE[p.unite],
      'Fournisseur principal': p.fournisseurPrincipal ?? '',
      "Seuil d'alerte": p.seuilAlerte,
      'Prix unitaire (FCFA)': p.prixUnitaire,
      'Stock total': p.quantiteTotale ?? 0,
      Actif: p.actif ? 'Oui' : 'Non',
    }));
    this.ecrire(rows, 'Produits', `catalogue-produits-${this.dateAujourdhui()}.xlsx`);
  }

  exporterMouvements(mouvements: MouvementStock[]): void {
    const rows = mouvements.map(m => ({
      Référence: m.reference ?? '',
      Date: this.formatDate(m.date),
      Produit: m.produitLibelle ?? m.produitId,
      Code: m.produitCode ?? '',
      Type: LIBELLES_TYPE_MOUVEMENT[m.type],
      Motif: LIBELLES_MOTIF_MOUVEMENT[m.motif],
      Quantité: m.quantite,
      Unité: m.unite ? LIBELLES_UNITE[m.unite] : '',
      'Site source': m.siteSourceNom ?? '',
      'Site destination': m.siteDestinationNom ?? '',
      Utilisateur: m.utilisateur ?? '',
      Commentaire: m.commentaire ?? '',
    }));
    this.ecrire(rows, 'Mouvements', `mouvements-stock-${this.dateAujourdhui()}.xlsx`);
  }

  exporterEtatStock(etats: EtatStock[]): void {
    const rows = etats.map(e => ({
      Code: e.produitCode,
      Produit: e.produitLibelle,
      Type: LIBELLES_TYPE_PRODUIT[e.typeProduit],
      Catégorie: e.categorieLibelle ?? '',
      Site: e.siteNom ?? 'Tous sites',
      Quantité: e.quantite,
      Unité: LIBELLES_UNITE[e.unite],
      "Seuil d'alerte": e.seuilAlerte,
      Statut: LIBELLES_STATUT_STOCK[e.statut],
      'Prix unitaire (FCFA)': e.prixUnitaire,
      'Valeur (FCFA)': e.valeur,
    }));
    this.ecrire(rows, 'État du stock', `etat-stock-${this.dateAujourdhui()}.xlsx`);
  }

  exporterSynthese(synthese: SyntheseMensuelle): void {
    const rows = synthese.lignes.map(l => ({
      Code: l.produitCode,
      Produit: l.produitLibelle,
      Catégorie: l.categorieLibelle ?? '',
      Unité: LIBELLES_UNITE[l.unite],
      'Stock initial': l.stockInitial,
      Entrées: l.entrees,
      Sorties: l.sorties,
      'Stock final': l.stockFinal,
      'Valeur finale (FCFA)': l.valeurFinale,
    }));
    this.ecrire(rows, 'Synthèse', `synthese-${synthese.mois}.xlsx`);
  }

  exporterTableauBord(rapport: RapportTableauBordStock): void {
    const wb = XLSX.utils.book_new();

    const kpis = [
      { Indicateur: 'Valeur totale du stock (FCFA)', Valeur: rapport.kpis.valeurTotale },
      { Indicateur: 'Nombre de produits', Valeur: rapport.kpis.nbProduits },
      { Indicateur: 'Produits en rupture', Valeur: rapport.kpis.nbRupture },
      { Indicateur: 'Produits en alerte', Valeur: rapport.kpis.nbAlerte },
      { Indicateur: 'Taux de rotation moyen', Valeur: rapport.kpis.tauxRotationMoyen },
      { Indicateur: 'Produits dormants', Valeur: rapport.kpis.nbDormants },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis), 'KPIs');

    const valeurCat = rapport.valeurParCategorie.map(v => ({ Catégorie: v.categorie, 'Valeur (FCFA)': v.valeur }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(valeurCat), 'Valeur par catégorie');

    const topConso = rapport.topConsommations.map(c => ({
      Produit: c.produitLibelle, Quantité: c.quantite, Unité: LIBELLES_UNITE[c.unite],
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topConso), 'Top consommations');

    const dormants = rapport.produitsDormants.map(d => ({
      Code: d.produitCode, Produit: d.produitLibelle,
      'Dernier mouvement': d.dernierMouvement ? this.formatDate(d.dernierMouvement) : 'Jamais',
      Quantité: d.quantite, 'Valeur (FCFA)': d.valeur,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dormants), 'Produits dormants');

    XLSX.writeFile(wb, `tableau-bord-stocks-${this.dateAujourdhui()}.xlsx`);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private ecrire(rows: object[], nomFeuille: string, nomFichier: string): void {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nomFeuille);
    XLSX.writeFile(wb, nomFichier);
  }

  private formatDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const jj = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${jj}/${mm}/${d.getFullYear()}`;
  }

  private dateAujourdhui(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
}
