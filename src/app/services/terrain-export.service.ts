import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { SiteClient } from '../models/terrain-site-client.model';
import { ApplicationPhyto } from '../models/terrain-phytosanitaire.model';
import { RapportTableauBordTerrain } from '../models/terrain-tableau-bord.model';
import {
  LIBELLES_FREQUENCE_PASSAGE,
} from '../constants/terrain.constants';

/**
 * Service d'export Excel — Module Exploitation Terrain (5.2).
 *
 * Génère les classeurs XLSX :
 * - Référentiel sites clients (export complet + template d'import)
 * - Registre phytosanitaire
 * - Rapport tableau de bord
 */
@Injectable({ providedIn: 'root' })
export class TerrainExportService {

  // ─── Sites clients ──────────────────────────────────────────────────────

  exporterSites(sites: SiteClient[]): void {
    const wb = XLSX.utils.book_new();
    const rows = sites.map((s) => ({
      'Code': s.code,
      'Nom': s.nom,
      'Raison sociale': s.raisonSociale ?? '',
      'Adresse': s.adresse,
      'Ville': s.ville,
      'Pays': s.pays ?? '',
      'Latitude': s.coordonnees.latitude,
      'Longitude': s.coordonnees.longitude,
      'Rayon tolérance (m)': s.rayonToleranceM ?? '',
      'Surface (m²)': s.surfaceM2 ?? '',
      'Fréquence': LIBELLES_FREQUENCE_PASSAGE[s.frequencePassage],
      'Fréquence personnalisée': s.frequencePersonnalisee ?? '',
      'Contact nom': s.contactPrincipal.nom,
      'Contact fonction': s.contactPrincipal.fonction ?? '',
      'Contact tél.': s.contactPrincipal.telephone,
      'Contact email': s.contactPrincipal.email ?? '',
      'Spécificités': s.specificites ?? '',
      'Actif': s.actif ? 'Oui' : 'Non',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Sites');
    XLSX.writeFile(wb, `sites-clients-${this.dateAujourdhui()}.xlsx`);
  }

  /** Template d'import vide avec une ligne d'exemple + feuille consignes. */
  genererTemplateImportSites(): void {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      {
        'Code*': 'SITE-DKR-001',
        'Nom*': 'Immeuble Liberté 6',
        'Raison sociale': 'SCI Liberté 6',
        'Adresse*': 'Avenue Bourguiba',
        'Ville*': 'Dakar',
        'Pays': 'Sénégal',
        'Latitude*': 14.6928,
        'Longitude*': -17.4467,
        'Rayon tolérance (m)': 100,
        'Surface (m²)': 1200,
        'Fréquence*': 'QUOTIDIEN',
        'Fréquence personnalisée': '',
        'Contact nom*': 'Mme Diallo',
        'Contact fonction': 'Syndic',
        'Contact tél.*': '+221 77 123 45 67',
        'Contact email': 'diallo@example.com',
        'Spécificités': 'Accès par parking sous-sol',
        'Actif': 'Oui',
      },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sites');

    const consignes = [
      ['Consignes d\'import — Sites Clients'],
      [''],
      ['Les colonnes marquées d\'un * sont obligatoires.'],
      [''],
      ['Code : identifiant unique métier (lettres/chiffres/tirets, sans espace).'],
      ['Latitude / Longitude : valeurs décimales (ex. 14.6928, -17.4467).'],
      ['Fréquence : QUOTIDIEN | HEBDOMADAIRE | BIMENSUEL | MENSUEL | TRIMESTRIEL | PERSONNALISE.'],
      ['Si Fréquence = PERSONNALISE, renseigner Fréquence personnalisée (texte libre).'],
      ['Actif : "Oui" ou "Non" (par défaut Oui si vide).'],
      [''],
      ['L\'import est transactionnel : en cas d\'erreur sur une ligne, aucun site n\'est créé.'],
    ];
    const wsConsignes = XLSX.utils.aoa_to_sheet(consignes);
    XLSX.utils.book_append_sheet(wb, wsConsignes, 'Consignes');

    XLSX.writeFile(wb, `template-import-sites-clients.xlsx`);
  }

  // ─── Registre phytosanitaire ────────────────────────────────────────────

  exporterRegistrePhyto(
    applications: ApplicationPhyto[],
    dateDebut: string,
    dateFin: string,
  ): void {
    const wb = XLSX.utils.book_new();
    const rows = applications.map((a) => ({
      'Date': a.dateApplication,
      'Site': a.siteNom ?? a.siteCode ?? '',
      'Produit': a.produitNomCommercial ?? '',
      'N° homologation': a.produitNumeroHomologation ?? '',
      'Dose appliquée': a.doseAppliquee,
      'Unité': a.doseUnite,
      'Zone traitée': a.zoneTraitee.libelle,
      'Surface (m²)': a.zoneTraitee.surfaceM2 ?? '',
      'Agent': a.employeNom ?? '',
      'Conditions météo': a.conditionsMeteo ?? '',
      'Température (°C)': a.temperatureC ?? '',
      'Fin réentrée': a.dateFinReentree ?? '',
      'Statut': a.statut,
      'Commentaire': a.commentaire ?? '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Registre');
    XLSX.writeFile(wb, `registre-phytosanitaire-${dateDebut}_${dateFin}.xlsx`);
  }

  // ─── Tableau de bord ────────────────────────────────────────────────────

  exporterTableauBord(rapport: RapportTableauBordTerrain): void {
    const wb = XLSX.utils.book_new();

    const kpiRows = [
      { Indicateur: 'Nb affectations planifiées', Valeur: rapport.kpis.nbAffectationsPlanifiees },
      { Indicateur: 'Nb interventions réalisées', Valeur: rapport.kpis.nbInterventionsRealisees },
      { Indicateur: 'Taux de couverture (%)', Valeur: (rapport.kpis.tauxCouverture * 100).toFixed(1) },
      { Indicateur: 'Nb agents actifs', Valeur: rapport.kpis.nbAgentsActifs },
      { Indicateur: 'Nb sites actifs', Valeur: rapport.kpis.nbSitesActifs },
      { Indicateur: 'Satisfaction moyenne (sur 5)', Valeur: rapport.kpis.satisfactionMoyenne.toFixed(2) },
      { Indicateur: 'Nb contrôles', Valeur: rapport.kpis.nbControles },
      { Indicateur: 'Nb contrôles conformes', Valeur: rapport.kpis.nbControlesConformes },
      { Indicateur: 'Nb incidents', Valeur: rapport.kpis.nbIncidents },
      { Indicateur: 'Nb alertes escaladées', Valeur: rapport.kpis.nbAlertesEscaladees },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), 'KPI');

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rapport.interventionsParSite.map((v) => ({
          Site: v.siteNom,
          Code: v.siteCode,
          Interventions: v.nbInterventions,
          Prévues: v.nbPrevues,
          'Couverture (%)': (v.tauxCouverture * 100).toFixed(1),
        })),
      ),
      'Interventions par site',
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rapport.incidentsParSite.map((i) => ({
          Site: i.siteNom,
          'Total incidents': i.nbIncidents,
          ...i.parType,
        })),
      ),
      'Incidents par site',
    );

    XLSX.writeFile(wb, `rapport-terrain-${rapport.kpis.dateDebut}_${rapport.kpis.dateFin}.xlsx`);
  }

  private dateAujourdhui(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
