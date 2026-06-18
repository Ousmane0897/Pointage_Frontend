import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

import { Produit } from '../models/stock-v2-produit.model';
import { MouvementStock } from '../models/stock-v2-mouvement.model';
import { EtatStock } from '../models/stock-v2-etat-stock.model';
import { SyntheseMensuelle } from '../models/stock-v2-synthese.model';
import { RapportTableauBordStock } from '../models/stock-v2-tableau-bord.model';
import { BonEntree } from '../models/stock-v2-bon-entree.model';
import { BonSortie, Destinataire } from '../models/stock-v2-bon-sortie.model';
import { ComparatifDotation } from '../models/stock-v2-dotation.model';
import {
  ConsommationDestinataire,
  RapportConsommation,
  StatistiqueCategorie,
} from '../models/stock-v2-consommation.model';
import { SyntheseConsoMensuelle } from '../models/stock-v2-analyse-mensuelle.model';
import { DetailChantier } from '../models/stock-v2-chantier.model';
import { SyntheseDons } from '../models/stock-v2-analyse-don.model';
import { MatriceComparatif } from '../models/stock-v2-analyse-comparatif.model';
import { ResultatCroise } from '../models/stock-v2-analyse-croisee.model';
import {
  LIBELLES_TYPE_PRODUIT,
  LIBELLES_UNITE,
  LIBELLES_TYPE_MOUVEMENT,
  LIBELLES_MOTIF_MOUVEMENT,
  LIBELLES_STATUT_STOCK,
  LIBELLES_TYPE_ENTREE,
  LIBELLES_TYPE_SORTIE,
  LIBELLES_STATUT_BON,
  LIBELLES_TYPE_DESTINATAIRE,
  LIBELLES_SENS_ECART_DOTATION,
  LIBELLES_NATURE_DON,
  LIBELLES_STATUT_CHANTIER,
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

  // ─── 7.4 Contrôle des mouvements ──────────────────────────────────────────

  exporterBonsEntree(bons: BonEntree[]): void {
    const rows = bons.map(b => ({
      Référence: b.reference ?? '',
      Date: this.formatDate(b.date),
      Type: LIBELLES_TYPE_ENTREE[b.type],
      'Site destination': b.siteDestinationNom ?? '',
      'Fournisseur / source': b.fournisseur ?? '',
      'Réf. commande': b.referenceCommande ?? '',
      'Nb lignes': b.lignes?.length ?? 0,
      Statut: LIBELLES_STATUT_BON[b.statut],
      Demandeur: b.demandeurNom ?? '',
      Validateur: b.validateurNom ?? '',
      'Montant (FCFA)': b.montantTotal ?? 0,
    }));
    this.ecrire(rows, "Bons d'entrée", `bons-entree-${this.dateAujourdhui()}.xlsx`);
  }

  exporterBonsSortie(bons: BonSortie[]): void {
    const rows = bons.map(b => ({
      Référence: b.reference ?? '',
      Date: this.formatDate(b.date),
      Type: LIBELLES_TYPE_SORTIE[b.type],
      'Site source': b.siteSourceNom ?? '',
      Destinataire: this.libelleDestinataire(b.destinataire),
      Motif: b.motif ?? '',
      'Nb lignes': b.lignes?.length ?? 0,
      Statut: LIBELLES_STATUT_BON[b.statut],
      Demandeur: b.demandeurNom ?? '',
      Validateur: b.validateurNom ?? '',
      'Montant (FCFA)': b.montantTotal ?? 0,
    }));
    this.ecrire(rows, 'Bons de sortie', `bons-sortie-${this.dateAujourdhui()}.xlsx`);
  }

  exporterStatistiquesCategorie(stats: StatistiqueCategorie[], nomFeuille: string): void {
    const rows = stats.map(s => ({
      Catégorie: s.libelle,
      'Nombre': s.nombre,
      Volume: s.volume,
      'Montant (FCFA)': s.montant,
      'Part (%)': s.pourcentage,
    }));
    this.ecrire(rows, nomFeuille, `statistiques-${this.slug(nomFeuille)}-${this.dateAujourdhui()}.xlsx`);
  }

  exporterHistoriqueDestinataire(consommations: ConsommationDestinataire[]): void {
    const rows = consommations.map(c => ({
      Destinataire: c.destinataireNom,
      Type: c.typeDestinataire,
      'Nb sorties': c.nbSorties,
      'Quantité totale': c.quantiteTotale,
      'Montant total (FCFA)': c.montantTotal,
    }));
    this.ecrire(rows, 'Par destinataire', `consommation-destinataires-${this.dateAujourdhui()}.xlsx`);
  }

  exporterDotation(comparatif: ComparatifDotation): void {
    const rows = comparatif.lignes.map(l => ({
      Site: l.siteNom ?? '',
      Produit: l.produitLibelle ?? l.produitId,
      Unité: l.unite ? LIBELLES_UNITE[l.unite] : '',
      Prévu: l.prevu,
      Réel: l.reel,
      Écart: l.ecart,
      'Écart (%)': l.pourcentageEcart,
      Statut: LIBELLES_SENS_ECART_DOTATION[l.sens],
    }));
    this.ecrire(rows, 'Dotation', `dotation-prevue-reelle-${comparatif.mois}.xlsx`);
  }

  exporterRapportConsommation(rapport: RapportConsommation): void {
    const rows = rapport.lignes.map(l => ({
      Libellé: l.libelle,
      Quantité: l.quantite,
      'Nb mouvements': l.nbMouvements,
      'Montant (FCFA)': l.montant,
    }));
    this.ecrire(rows, 'Rapport conso.', `rapport-consommation-${this.dateAujourdhui()}.xlsx`);
  }

  // ─── 7.5 Analyse des consommations ────────────────────────────────────────

  exporterConsoMensuelle(synthese: SyntheseConsoMensuelle, periode: string): void {
    const wb = XLSX.utils.book_new();
    const kpis = [
      { Indicateur: 'Coût total (FCFA)', Valeur: synthese.kpis.coutTotal },
      { Indicateur: 'Quantité totale', Valeur: synthese.kpis.quantiteTotale },
      { Indicateur: 'Nombre de produits', Valeur: synthese.kpis.nbProduits },
      { Indicateur: 'Nombre de mouvements', Valeur: synthese.kpis.nbMouvements },
      { Indicateur: 'Évolution coût (%)', Valeur: synthese.kpis.evolutionCoutPct ?? 0 },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis), 'KPIs');

    const lignes = synthese.lignes.map(l => ({
      Code: l.produitCode ?? '',
      Produit: l.produitLibelle ?? l.produitId,
      Unité: l.unite ? LIBELLES_UNITE[l.unite] : '',
      Quantité: l.quantite,
      'Coût (FCFA)': l.cout,
      'Évolution (%)': l.evolutionPct ?? '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lignes), 'Détail produits');

    XLSX.writeFile(wb, `consommation-mensuelle-${periode}.xlsx`);
  }

  exporterDetailChantier(detail: DetailChantier): void {
    const c = detail.chantier;
    const wb = XLSX.utils.book_new();
    const entete = [
      { Champ: 'Référence', Valeur: c.reference },
      { Champ: 'Nom', Valeur: c.nom },
      { Champ: 'Site', Valeur: c.siteNom ?? '' },
      { Champ: 'Client', Valeur: c.client ?? '' },
      { Champ: 'Date début', Valeur: this.formatDate(c.dateDebut) },
      { Champ: 'Date fin', Valeur: c.dateFin ? this.formatDate(c.dateFin) : '' },
      { Champ: 'Statut', Valeur: LIBELLES_STATUT_CHANTIER[c.statut] },
      { Champ: 'Coût total (FCFA)', Valeur: detail.coutTotal },
      { Champ: 'Durée (jours)', Valeur: detail.dureeJours ?? '' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entete), 'Chantier');

    const lignes = detail.lignes.map(l => ({
      Code: l.produitCode ?? '',
      Produit: l.produitLibelle ?? l.produitId,
      Unité: l.unite ? LIBELLES_UNITE[l.unite] : '',
      Quantité: l.quantite,
      'Prix unitaire (FCFA)': l.prixUnitaire ?? '',
      'Montant (FCFA)': l.montant,
      'Première conso.': l.premiereDate ? this.formatDate(l.premiereDate) : '',
      'Dernière conso.': l.derniereDate ? this.formatDate(l.derniereDate) : '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lignes), 'Consommations');

    XLSX.writeFile(wb, `chantier-${this.slug(c.reference)}-${this.dateAujourdhui()}.xlsx`);
  }

  exporterDons(synthese: SyntheseDons, periode: string): void {
    const wb = XLSX.utils.book_new();
    const kpis = [
      { Indicateur: 'Montant total (FCFA)', Valeur: synthese.kpis.montantTotal },
      { Indicateur: 'Nombre de dons', Valeur: synthese.kpis.nbDons },
      { Indicateur: 'Nombre de bénéficiaires', Valeur: synthese.kpis.nbBeneficiaires },
      { Indicateur: 'Évolution (%)', Valeur: synthese.kpis.evolutionPct ?? 0 },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis), 'KPIs');

    const lignes = synthese.lignes.map(l => ({
      Référence: l.reference ?? '',
      Date: this.formatDate(l.date),
      Nature: LIBELLES_NATURE_DON[l.natureDon],
      Bénéficiaire: l.beneficiaire ?? '',
      'Site source': l.siteSourceNom ?? '',
      'Nb produits': l.nbProduits,
      Quantité: l.quantiteTotale,
      'Montant (FCFA)': l.montant,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lignes), 'Dons');

    XLSX.writeFile(wb, `dons-${periode}.xlsx`);
  }

  exporterComparatif(matrice: MatriceComparatif): void {
    const rows = matrice.lignes.map(l => {
      const row: Record<string, string | number> = { Libellé: l.libelle };
      matrice.mois.forEach((m, i) => { row[m] = l.cellules[i]?.valeur ?? 0; });
      row['Total (FCFA)'] = l.total;
      row['Évolution (%)'] = l.evolutionGlobalePct ?? '';
      return row;
    });
    this.ecrire(rows, 'Comparatif', `comparatif-mensuel-${this.dateAujourdhui()}.xlsx`);
  }

  exporterCroise(resultat: ResultatCroise): void {
    const rows = resultat.lignes.map(l => {
      const row: Record<string, string | number> = { Libellé: l.libelle };
      if (resultat.entetesColonnes.length > 0) {
        resultat.entetesColonnes.forEach((c, i) => { row[c] = l.valeurs[i] ?? 0; });
      } else {
        row['Valeur'] = l.total;
      }
      row['Total'] = l.total;
      return row;
    });
    this.ecrire(rows, 'Analyse croisée', `analyse-croisee-${this.dateAujourdhui()}.xlsx`);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private libelleDestinataire(d: Destinataire): string {
    const nom = d.siteNom ?? d.agentNom ?? d.clientNom ?? '';
    return `${nom} (${LIBELLES_TYPE_DESTINATAIRE[d.type]})`;
  }

  private slug(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

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
