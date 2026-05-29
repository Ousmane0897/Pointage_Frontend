import { Routes } from '@angular/router';
import { PageCodePinComponent } from './page-code-pin/page-code-pin.component';
import { HomePageComponent } from './home-page/home-page.component';
import { FinalPage1Component } from './final-page1/final-page1.component';
import { FinalPage2Component } from './final-page2/final-page2.component';
import { DashboardComponent } from './adminPage/exploitation/dashboard/dashboard.component';
import { AdminComponent } from './adminPage/admin/admin.component';
import { AuthGuard } from './guards/auth.guard';


export const routes: Routes = [
    { path: '', loadComponent: () => import('./home-page/home-page.component').then(m => m.HomePageComponent) }, // lazy loading de la page d'accueil
    { path: 'home', loadComponent: () => import('./home-page/home-page.component').then(m => m.HomePageComponent) }, // lazy loading de la page d'accueil
    { path: 'code-pin', loadComponent: () => import('./page-code-pin/page-code-pin.component').then(m => m.PageCodePinComponent) }, // lazy loading de la page code pin
    { 
    path: 'change-password', 
    loadComponent: () => import('./changement-password/changement-password.component')
        .then(m => m.ChangementPasswordComponent),
    canActivate: [AuthGuard]   // 🔐 protection ici
},
    { path: 'forgot-password', loadComponent: () => import('./adminPage/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) }, // lazy loading de la page mot de passe oublié
    { path: 'reset-password', loadComponent: () => import('./adminPage/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) }, // lazy loading de la page réinitialisation mot de passe
    { path: 'pagefinal1/:codeSecret', loadComponent: () => import('./final-page1/final-page1.component').then(m => m.FinalPage1Component) }, // lazy loading de la page final 1
    { path: 'pagefinal2/:codeSecret', loadComponent: () => import('./final-page2/final-page2.component').then(m => m.FinalPage2Component) }, // lazy loading de la page final 2
    {
        path: 'super-admin-login', loadComponent: () => import('./super-admin-login-page/super-admin-login-page.component').then(m => m.SuperAdminLoginPageComponent), // lazy loading de la page de connexion du super admin
    },
    {
        path: 'admin', loadComponent: () => import('./adminPage/admin/admin.component').then(m => m.AdminComponent), // lazy loading de la page admin

        canActivate: [AuthGuard], // protection de la route admin avec AuthGuard
        children: [
            //{ path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // redirection vers la page dashboard par défaut
            { path: 'dashboard', loadComponent: () => import('./adminPage/exploitation/dashboard/dashboard.component').then(m => m.DashboardComponent) }, // lazy loading de la page dashboard
            { path: 'page-par-defaut-apres-login', loadComponent: () => import('./adminPage/page-par-defaut-apres-login/page-par-defaut-apres-login.component').then(m => m.PageParDefautApresLoginComponent) }, // lazy loading de la page par défaut après login

            { path: 'dashboard-par-agence', loadComponent: () => import('./adminPage/exploitation/dashboard-par-agence/tableau-de-bord-par-agence.component').then(m => m.TableauDeBordParAgenceComponent) }, // lazy loading de la page tableau de bord par agence
            { path: 'operations/planification', loadComponent: () => import('./adminPage/exploitation/planification/planification.component').then(m => m.PlanificationComponent) }, // lazy loading de la page planification
            { path: 'calendrier', loadComponent: () => import('./adminPage/exploitation/calendrier/calendrier.component').then(m => m.CalendrierComponent) },
            //{ path: 'employes', loadComponent: () => import('./adminPage/exploitation/employes/employes.component').then(m => m.EmployesComponent) }, // lazy loading de la page employes
            { path: 'employes/donnees-complet', loadComponent: () => import('./adminPage/exploitation/employes-complet/employes-complet.component').then(m => m.EmployesCompletComponent) }, // lazy loading de la page employes complet
            { path: 'employes/donnees-complet1', loadComponent: () => import('./adminPage/exploitation/employes-complet/employes-complet.component').then(m => m.EmployesCompletComponent) }, // lazy loading de la page employes complet
            { path: 'operations/agents', loadComponent: () => import('./adminPage/exploitation/employes-complet/employes-complet.component').then(m => m.EmployesCompletComponent) }, // lazy loading de la page agents
            { path: 'operations/statistique-par-agence-groupe', loadComponent: () => import('./adminPage/exploitation/statistique-par-agence-groupe/statistique-par-agence-groupe.component').then(m => m.StatistiqueParAgenceGroupeComponent) }, // lazy loading de la page statistique par agence groupe
            { path: 'employes/donnees-partiel', loadComponent: () => import('./adminPage/exploitation/employes/employes.component').then(m => m.EmployesComponent) }, // lazy loading de la page données employé
            { path: 'collecte-et-livraison/collecte-des-besoins', loadComponent: () => import('./adminPage/exploitation/collecte et livraison/collecte-des-besoins/collecte-des-besoins.component').then(m => m.CollecteDesBesoinsComponent) }, // lazy loading de la page collecte des besoins
            { path: 'collecte-et-livraison/suivi-livraison', loadComponent: () => import('./adminPage/exploitation/collecte et livraison/suivi-commandes/suivi-commandes.component').then(m => m.SuiviCommandesComponent) }, // lazy loading de la page livraison des besoins
            { path: 'collecte-et-livraison/historique-livraisons', loadComponent: () => import('./adminPage/exploitation/collecte et livraison/historique-livraisons/historique-livraisons.component').then(m => m.HistoriqueLivraisonsComponent) }, // lazy loading de la page historique des livraisons
            { path: 'stock/entrees', loadComponent: () => import('./adminPage/exploitation/stock/entrees/entrees.component').then(m => m.EntreesComponent) }, // lazy loading de la page entrees
            { path: 'stock/sorties', loadComponent: () => import('./adminPage/exploitation/stock/sorties/sorties.component').then(m => m.SortiesComponent) }, // lazy loading de la page sorties
            { path: 'stock/produits', loadComponent: () => import('./adminPage/exploitation/stock/produit-list/produit-list.component').then(m => m.ProduitListComponent) }, // lazy loading de la page produits
            { path: 'stock/historiques-entrees', loadComponent: () => import('./adminPage/exploitation/stock/historiques-entrees/historiques-entrees.component').then(m => m.HistoriquesEntreesComponent) }, // lazy loading de la page historiques entrées
            { path: 'stock/historiques-sorties', loadComponent: () => import('./adminPage/exploitation/stock/historiques-sorties/historiques-sorties.component').then(m => m.HistoriquesSortiesComponent) }, // lazy loading de la page historiques sorties
            //{ path: 'stock/rapports-mensuels', loadComponent: () => import('./adminPage/exploitation/stock/rapport-mensuel/rapport-mensuel.component').then(m => m.RapportMensuelComponent) }, // lazy loading de la page rapports mensuels
            { path: 'stock/suivi', loadComponent: () => import('./adminPage/exploitation/stock/suivi-stock/suivi-stock.component').then(m => m.SuiviStockComponent) }, // lazy loading de la page suivi
            { path: 'feries', loadComponent: () => import('./adminPage/exploitation/ferie/ferie.component').then(m => m.FerieComponent) }, // lazy loading de la page feries
            { path: 'gestion-privilege', loadComponent: () => import('./adminPage/gestion-privilege/gestion-privilege.component').then(m => m.GestionPrivilegeComponent),}, // lazy loading de la page gestion privilege
            { path: 'pointages/pointagesDuJour', loadComponent: () => import('./adminPage/exploitation/pointages/pointages.component').then(m => m.PointagesComponent) }, // lazy loading de la page pointages
            { path: 'pointages/historique', loadComponent: () => import('./adminPage/exploitation/pointage-historique/pointage-historique.component').then(m => m.PointageHistoriqueComponent) }, // lazy loading de la page historique des pointages
            //{ path: 'ressources-humaines', loadComponent: () => import('./adminPage/agents-rh/agents-rh.component').then(m => m.AgentsRhComponent) }, // lazy loading de la page ressources humaines
            { path: 'operations/agences', loadComponent: () => import('./adminPage/exploitation/agences/agences.component').then(m => m.AgencesComponent) }, // lazy loading de la page agences
            { path: 'absences/tempsreel', loadComponent: () => import('./adminPage/exploitation/absences-temps-reel/absences-temps-reel.component').then(m => m.AbsencesTempsReelComponent) }, // lazy loading de la page absences
            { path: 'absences/historique', loadComponent: () => import('./adminPage/exploitation/absences-historique/absences-historique.component').then(m => m.AbsencesHistoriqueComponent) }, // lazy loading de la page absences

            // ─── Gestion du Personnel ────────────────────────────────────
            { path: 'rh/gestion-du-personnel/dossier-employe', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/dossier-employe/liste-employes/liste-employes.component').then(m => m.ListeEmployesComponent) },
            { path: 'rh/gestion-du-personnel/dossier-employe/nouveau', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/dossier-employe/formulaire-employe/formulaire-employe.component').then(m => m.FormulaireEmployeComponent) },
            { path: 'rh/gestion-du-personnel/dossier-employe/fiche/:id', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/dossier-employe/fiche-employe/fiche-employe.component').then(m => m.FicheEmployeComponent) },
            { path: 'rh/gestion-du-personnel/dossier-employe/modifier/:id', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/dossier-employe/formulaire-employe/formulaire-employe.component').then(m => m.FormulaireEmployeComponent) },
            { path: 'rh/gestion-du-personnel/contrats', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/contrats/liste-contrats/liste-contrats.component').then(m => m.ListeContratsComponent) },
            { path: 'rh/gestion-du-personnel/contrats/nouveau', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/contrats/formulaire-contrat/formulaire-contrat.component').then(m => m.FormulaireContratComponent) },
            { path: 'rh/gestion-du-personnel/contrats/nouveau/:employeId', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/contrats/formulaire-contrat/formulaire-contrat.component').then(m => m.FormulaireContratComponent) },
            { path: 'rh/gestion-du-personnel/contrats/:id/modifier', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/contrats/formulaire-contrat/formulaire-contrat.component').then(m => m.FormulaireContratComponent) },
            { path: 'rh/gestion-du-personnel/contrats/:id/avenants', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/contrats/avenants/avenants.component').then(m => m.AvenantsComponent) },
            { path: 'rh/gestion-du-personnel/organigramme', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/organigramme/organigramme.component').then(m => m.OrganigrammeComponent) },
            { path: 'rh/gestion-du-personnel/periode-essai', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/periode-essai/suivi-periodes/suivi-periodes.component').then(m => m.SuiviPeriodesComponent) },
            { path: 'rh/gestion-du-personnel/periode-essai/validation', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/periode-essai/validation-titularisation/validation-titularisation.component').then(m => m.ValidationTitularisationComponent) },
            { path: 'rh/gestion-du-personnel/documents', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/documents/liste-documents/liste-documents.component').then(m => m.ListeDocumentsComponent) },
            { path: 'rh/gestion-du-personnel/documents/visualiser/:id', loadComponent: () => import('./adminPage/ressources-humaines/gestion-du-personnel/documents/visualisation-document/visualisation-document.component').then(m => m.VisualisationDocumentComponent) },

            // ─── Temps & Présences ───────────────────────────────────────
            { path: 'rh/temps-et-presences/pointage-centralise', loadComponent: () => import('./adminPage/ressources-humaines/temps-et-presences/pointage-centralise/pointage-centralise.component').then(m => m.PointageCentraliseComponent) },
            { path: 'rh/temps-et-presences/absences', loadComponent: () => import('./adminPage/ressources-humaines/temps-et-presences/gestion-absences/liste-absences/liste-absences.component').then(m => m.ListeAbsencesComponent) },
            { path: 'rh/temps-et-presences/absences/nouvelle', loadComponent: () => import('./adminPage/ressources-humaines/temps-et-presences/gestion-absences/formulaire-absence/formulaire-absence.component').then(m => m.FormulaireAbsenceComponent) },
            { path: 'rh/temps-et-presences/absences/:id/modifier', loadComponent: () => import('./adminPage/ressources-humaines/temps-et-presences/gestion-absences/formulaire-absence/formulaire-absence.component').then(m => m.FormulaireAbsenceComponent) },
            { path: 'rh/temps-et-presences/conges', loadComponent: () => import('./adminPage/ressources-humaines/temps-et-presences/calendrier-conges/calendrier-conges.component').then(m => m.CalendrierCongesComponent) },
            { path: 'rh/temps-et-presences/conges/demande', loadComponent: () => import('./adminPage/ressources-humaines/temps-et-presences/calendrier-conges/demande-conge/demande-conge.component').then(m => m.DemandeCongeComponent) },
            { path: 'rh/temps-et-presences/conges/validation', loadComponent: () => import('./adminPage/ressources-humaines/temps-et-presences/calendrier-conges/validation-conges/validation-conges.component').then(m => m.ValidationCongesComponent) },
            { path: 'rh/temps-et-presences/heures-supplementaires', loadComponent: () => import('./adminPage/ressources-humaines/temps-et-presences/heures-supplementaires/liste-heures-sup/liste-heures-sup.component').then(m => m.ListeHeuresSupComponent) },
            { path: 'rh/temps-et-presences/heures-supplementaires/declaration', loadComponent: () => import('./adminPage/ressources-humaines/temps-et-presences/heures-supplementaires/declaration-heures-sup/declaration-heures-sup.component').then(m => m.DeclarationHeuresSupComponent) },
            { path: 'rh/temps-et-presences/recapitulatif', loadComponent: () => import('./adminPage/ressources-humaines/temps-et-presences/recapitulatif-mensuel/recapitulatif-mensuel.component').then(m => m.RecapitulatifMensuelComponent) },

            // ─── Paie ────────────────────────────────────────────────
            { path: 'rh/paie/grille-salariale', loadComponent: () => import('./adminPage/ressources-humaines/paie/grille-salariale/liste-categories/liste-categories.component').then(m => m.ListeCategoriesComponent) },
            { path: 'rh/paie/grille-salariale/nouvelle', loadComponent: () => import('./adminPage/ressources-humaines/paie/grille-salariale/formulaire-categorie/formulaire-categorie.component').then(m => m.FormulaireCategorieComponent) },
            { path: 'rh/paie/grille-salariale/:id/modifier', loadComponent: () => import('./adminPage/ressources-humaines/paie/grille-salariale/formulaire-categorie/formulaire-categorie.component').then(m => m.FormulaireCategorieComponent) },
            { path: 'rh/paie/calcul-bulletin', loadComponent: () => import('./adminPage/ressources-humaines/paie/calcul-bulletin/calcul-bulletin.component').then(m => m.CalculBulletinComponent) },
            { path: 'rh/paie/bulletins-pdf/:id', loadComponent: () => import('./adminPage/ressources-humaines/paie/bulletins-pdf/generation-bulletin.component').then(m => m.GenerationBulletinComponent) },
            { path: 'rh/paie/historique', loadComponent: () => import('./adminPage/ressources-humaines/paie/historique-paies/liste-bulletins/liste-bulletins.component').then(m => m.ListeBulletinsComponent) },
            { path: 'rh/paie/historique/:id', loadComponent: () => import('./adminPage/ressources-humaines/paie/historique-paies/fiche-bulletin/fiche-bulletin.component').then(m => m.FicheBulletinComponent) },
            { path: 'rh/paie/declarations', loadComponent: () => import('./adminPage/ressources-humaines/paie/declarations-sociales/liste-declarations/liste-declarations.component').then(m => m.ListeDeclarationsComponent) },
            { path: 'rh/paie/declarations/generer', loadComponent: () => import('./adminPage/ressources-humaines/paie/declarations-sociales/generation-declaration/generation-declaration.component').then(m => m.GenerationDeclarationComponent) },

            // ─── Développement RH — Sanctions ──────────────────────
            { path: 'rh/developpement-rh/sanctions', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/sanctions/liste-sanctions/liste-sanctions.component').then(m => m.ListeSanctionsComponent) },
            { path: 'rh/developpement-rh/sanctions/nouvelle', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/sanctions/formulaire-sanction/formulaire-sanction.component').then(m => m.FormulaireSanctionComponent) },
            { path: 'rh/developpement-rh/sanctions/:id', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/sanctions/fiche-sanction/fiche-sanction.component').then(m => m.FicheSanctionComponent) },
            { path: 'rh/developpement-rh/sanctions/:id/modifier', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/sanctions/formulaire-sanction/formulaire-sanction.component').then(m => m.FormulaireSanctionComponent) },
            { path: 'rh/developpement-rh/sanctions/historique/:employeId', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/sanctions/historique-disciplinaire/historique-disciplinaire.component').then(m => m.HistoriqueDisciplinaireComponent) },

            // ─── Développement RH — Plan de Formation ─────────────
            { path: 'rh/developpement-rh/formations', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/plan-formation/liste-formations/liste-formations.component').then(m => m.ListeFormationsComponent) },
            { path: 'rh/developpement-rh/formations/nouvelle', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/plan-formation/formulaire-formation/formulaire-formation.component').then(m => m.FormulaireFormationComponent) },
            { path: 'rh/developpement-rh/formations/:id/modifier', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/plan-formation/formulaire-formation/formulaire-formation.component').then(m => m.FormulaireFormationComponent) },
            { path: 'rh/developpement-rh/formations/sessions', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/plan-formation/sessions/liste-sessions/liste-sessions.component').then(m => m.ListeSessionsComponent) },
            { path: 'rh/developpement-rh/formations/sessions/nouvelle', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/plan-formation/sessions/formulaire-session/formulaire-session.component').then(m => m.FormulaireSessionComponent) },
            { path: 'rh/developpement-rh/formations/sessions/:id/modifier', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/plan-formation/sessions/formulaire-session/formulaire-session.component').then(m => m.FormulaireSessionComponent) },
            { path: 'rh/developpement-rh/formations/sessions/:id/participants', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/plan-formation/sessions/suivi-participants/suivi-participants.component').then(m => m.SuiviParticipantsComponent) },
            { path: 'rh/developpement-rh/formations/sessions/:id/evaluation', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/plan-formation/sessions/evaluation-session/evaluation-session.component').then(m => m.EvaluationSessionComponent) },
            { path: 'rh/developpement-rh/formations/besoins', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/plan-formation/besoins-formation/liste-besoins/liste-besoins.component').then(m => m.ListeBesoinsComponent) },
            { path: 'rh/developpement-rh/formations/besoins/nouveau', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/plan-formation/besoins-formation/formulaire-besoin/formulaire-besoin.component').then(m => m.FormulaireBesoinComponent) },
            { path: 'rh/developpement-rh/formations/besoins/:id/modifier', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/plan-formation/besoins-formation/formulaire-besoin/formulaire-besoin.component').then(m => m.FormulaireBesoinComponent) },
            { path: 'rh/developpement-rh/formations/recap-budget', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/plan-formation/recap-budget/recap-budget.component').then(m => m.RecapBudgetComponent) },

            // ─── Développement RH — Évaluations Périodiques ────────
            { path: 'rh/developpement-rh/evaluations/grilles', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/evaluations/grilles/liste-grilles/liste-grilles.component').then(m => m.ListeGrillesComponent) },
            { path: 'rh/developpement-rh/evaluations/grilles/nouvelle', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/evaluations/grilles/formulaire-grille/formulaire-grille.component').then(m => m.FormulaireGrilleComponent) },
            { path: 'rh/developpement-rh/evaluations/grilles/:id/modifier', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/evaluations/grilles/formulaire-grille/formulaire-grille.component').then(m => m.FormulaireGrilleComponent) },
            { path: 'rh/developpement-rh/evaluations', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/evaluations/liste-evaluations/liste-evaluations.component').then(m => m.ListeEvaluationsComponent) },
            { path: 'rh/developpement-rh/evaluations/nouvelle', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/evaluations/formulaire-evaluation/formulaire-evaluation.component').then(m => m.FormulaireEvaluationComponent) },
            { path: 'rh/developpement-rh/evaluations/:id', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/evaluations/formulaire-evaluation/formulaire-evaluation.component').then(m => m.FormulaireEvaluationComponent) },
            { path: 'rh/developpement-rh/evaluations/historique/:employeId', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/evaluations/historique-employe/historique-employe.component').then(m => m.HistoriqueEmployeComponent) },

            // ─── Développement RH — Tableau de Bord RH ────────────
            { path: 'rh/developpement-rh/tableau-de-bord', loadComponent: () => import('./adminPage/ressources-humaines/developpement-rh/tableau-de-bord/tableau-de-bord-rh/tableau-de-bord-rh.component').then(m => m.TableauDeBordRhComponent) },

            // ─── Exploitation v2 / Production Chimie (5.1) ────────────
            // Matières premières
            { path: 'exploitation-v2/production-chimie/matieres-premieres', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/matieres-premieres/liste-matieres/liste-matieres.component').then(m => m.ListeMatieresComponent) },
            { path: 'exploitation-v2/production-chimie/matieres-premieres/nouvelle', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/matieres-premieres/formulaire-matiere/formulaire-matiere.component').then(m => m.FormulaireMatiereComponent) },
            { path: 'exploitation-v2/production-chimie/matieres-premieres/reception', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/matieres-premieres/reception-mp/reception-mp.component').then(m => m.ReceptionMpComponent) },
            { path: 'exploitation-v2/production-chimie/matieres-premieres/mouvements', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/matieres-premieres/mouvements-stock-chimie/mouvements-stock-chimie.component').then(m => m.MouvementsStockChimieComponent) },
            { path: 'exploitation-v2/production-chimie/matieres-premieres/:id/mouvements', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/matieres-premieres/mouvements-stock-chimie/mouvements-stock-chimie.component').then(m => m.MouvementsStockChimieComponent) },
            { path: 'exploitation-v2/production-chimie/matieres-premieres/:id/modifier', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/matieres-premieres/formulaire-matiere/formulaire-matiere.component').then(m => m.FormulaireMatiereComponent) },

            // Conditionnement
            { path: 'exploitation-v2/production-chimie/conditionnement/formats', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/conditionnement/liste-formats/liste-formats.component').then(m => m.ListeFormatsComponent) },
            { path: 'exploitation-v2/production-chimie/conditionnement/formats/nouveau', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/conditionnement/formulaire-format/formulaire-format.component').then(m => m.FormulaireFormatComponent) },
            { path: 'exploitation-v2/production-chimie/conditionnement/formats/:id/modifier', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/conditionnement/formulaire-format/formulaire-format.component').then(m => m.FormulaireFormatComponent) },
            { path: 'exploitation-v2/production-chimie/conditionnement/etiquettes', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/conditionnement/generation-etiquettes/generation-etiquettes.component').then(m => m.GenerationEtiquettesComponent) },

            // Fiches de formulation
            { path: 'exploitation-v2/production-chimie/formulations', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/fiches-formulation/liste-formulations/liste-formulations.component').then(m => m.ListeFormulationsComponent) },
            { path: 'exploitation-v2/production-chimie/formulations/nouvelle', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/fiches-formulation/formulaire-formulation/formulaire-formulation.component').then(m => m.FormulaireFormulationComponent) },
            { path: 'exploitation-v2/production-chimie/formulations/:id/modifier', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/fiches-formulation/formulaire-formulation/formulaire-formulation.component').then(m => m.FormulaireFormulationComponent) },
            { path: 'exploitation-v2/production-chimie/formulations/:id/versions', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/fiches-formulation/historique-versions/historique-versions.component').then(m => m.HistoriqueVersionsComponent) },
            { path: 'exploitation-v2/production-chimie/formulations/:id/versions/comparer', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/fiches-formulation/comparaison-versions/comparaison-versions.component').then(m => m.ComparaisonVersionsComponent) },

            // Ordres de fabrication
            { path: 'exploitation-v2/production-chimie/ordres', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/ordres-fabrication/liste-ordres/liste-ordres.component').then(m => m.ListeOrdresComponent) },
            { path: 'exploitation-v2/production-chimie/ordres/kanban', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/ordres-fabrication/kanban-ordres/kanban-ordres.component').then(m => m.KanbanOrdresComponent) },
            { path: 'exploitation-v2/production-chimie/ordres/nouveau', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/ordres-fabrication/formulaire-ordre/formulaire-ordre.component').then(m => m.FormulaireOrdreComponent) },
            { path: 'exploitation-v2/production-chimie/ordres/:id', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/ordres-fabrication/detail-ordre/detail-ordre.component').then(m => m.DetailOrdreComponent) },

            // Lots & traçabilité
            { path: 'exploitation-v2/production-chimie/lots', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/lots-tracabilite/liste-lots/liste-lots.component').then(m => m.ListeLotsComponent) },
            { path: 'exploitation-v2/production-chimie/lots/:id', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/lots-tracabilite/fiche-lot/fiche-lot.component').then(m => m.FicheLotComponent) },
            { path: 'exploitation-v2/production-chimie/lots/:id/tracabilite', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/lots-tracabilite/tracabilite-lot/tracabilite-lot.component').then(m => m.TracabiliteLotComponent) },

            // Contrôle qualité
            { path: 'exploitation-v2/production-chimie/controles', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/controle-qualite/liste-controles/liste-controles.component').then(m => m.ListeControlesComponent) },
            { path: 'exploitation-v2/production-chimie/controles/grilles', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/controle-qualite/grille-tests/grille-tests.component').then(m => m.GrilleTestsComponent) },
            { path: 'exploitation-v2/production-chimie/controles/nouveau/:lotId', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/controle-qualite/formulaire-controle/formulaire-controle.component').then(m => m.FormulaireControleComponent) },
            { path: 'exploitation-v2/production-chimie/controles/historique/:produitNom', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/controle-qualite/historique-controles/historique-controles.component').then(m => m.HistoriqueControlesComponent) },
            { path: 'exploitation-v2/production-chimie/controles/:id', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/controle-qualite/fiche-controle/fiche-controle.component').then(m => m.FicheControleComponent) },

            // Tableau de bord
            { path: 'exploitation-v2/production-chimie/tableau-bord', loadComponent: () => import('./adminPage/exploitation-v2/production-chimie/tableau-bord-production/tableau-bord-production.component').then(m => m.TableauBordProductionComponent) },

            // ─── Exploitation Terrain (5.2) ──────────────────────────────────────
            // Sites clients
            { path: 'exploitation-v2/terrain/sites-clients', loadComponent: () => import('./adminPage/exploitation-v2/terrain/sites-clients/liste-sites/liste-sites.component').then(m => m.ListeSitesComponent) },
            { path: 'exploitation-v2/terrain/sites-clients/nouveau', loadComponent: () => import('./adminPage/exploitation-v2/terrain/sites-clients/formulaire-site/formulaire-site.component').then(m => m.FormulaireSiteComponent) },
            { path: 'exploitation-v2/terrain/sites-clients/:id/modifier', loadComponent: () => import('./adminPage/exploitation-v2/terrain/sites-clients/formulaire-site/formulaire-site.component').then(m => m.FormulaireSiteComponent) },
            { path: 'exploitation-v2/terrain/sites-clients/:id', loadComponent: () => import('./adminPage/exploitation-v2/terrain/sites-clients/fiche-site/fiche-site.component').then(m => m.FicheSiteComponent) },

            // Planning des équipes
            { path: 'exploitation-v2/terrain/planning/affectations', loadComponent: () => import('./adminPage/exploitation-v2/terrain/planning/liste-affectations/liste-affectations.component').then(m => m.ListeAffectationsComponent) },
            { path: 'exploitation-v2/terrain/planning/calendrier', loadComponent: () => import('./adminPage/exploitation-v2/terrain/planning/calendrier-planning/calendrier-planning.component').then(m => m.CalendrierPlanningComponent) },
            { path: 'exploitation-v2/terrain/planning/conflits', loadComponent: () => import('./adminPage/exploitation-v2/terrain/planning/detection-conflits/detection-conflits.component').then(m => m.DetectionConflitsComponent) },
            { path: 'exploitation-v2/terrain/planning/affectations/nouvelle', loadComponent: () => import('./adminPage/exploitation-v2/terrain/planning/formulaire-affectation/formulaire-affectation.component').then(m => m.FormulaireAffectationComponent) },
            { path: 'exploitation-v2/terrain/planning/affectations/:id/modifier', loadComponent: () => import('./adminPage/exploitation-v2/terrain/planning/formulaire-affectation/formulaire-affectation.component').then(m => m.FormulaireAffectationComponent) },
            { path: 'exploitation-v2/terrain/planning/affectations/:id', loadComponent: () => import('./adminPage/exploitation-v2/terrain/planning/fiche-affectation/fiche-affectation.component').then(m => m.FicheAffectationComponent) },

            // Pointage terrain GPS
            { path: 'exploitation-v2/terrain/pointage/nouveau', loadComponent: () => import('./adminPage/exploitation-v2/terrain/pointage/pointer-terrain/pointer-terrain.component').then(m => m.PointerTerrainComponent) },
            { path: 'exploitation-v2/terrain/pointage/aujourd-hui', loadComponent: () => import('./adminPage/exploitation-v2/terrain/pointage/suivi-pointages/suivi-pointages.component').then(m => m.SuiviPointagesComponent) },
            { path: 'exploitation-v2/terrain/pointage/historique', loadComponent: () => import('./adminPage/exploitation-v2/terrain/pointage/historique-pointages/historique-pointages.component').then(m => m.HistoriquePointagesComponent) },
            { path: 'exploitation-v2/terrain/pointage/historique/:id', loadComponent: () => import('./adminPage/exploitation-v2/terrain/pointage/fiche-pointage/fiche-pointage.component').then(m => m.FichePointageComponent) },

            // Alertes & escalade
            { path: 'exploitation-v2/terrain/alertes', loadComponent: () => import('./adminPage/exploitation-v2/terrain/alertes/tableau-alertes/tableau-alertes.component').then(m => m.TableauAlertesComponent) },
            { path: 'exploitation-v2/terrain/alertes/recap', loadComponent: () => import('./adminPage/exploitation-v2/terrain/alertes/recapitulatif-quotidien/recapitulatif-quotidien.component').then(m => m.RecapitulatifQuotidienComponent) },
            { path: 'exploitation-v2/terrain/alertes/parametres', loadComponent: () => import('./adminPage/exploitation-v2/terrain/alertes/parametres-escalade/parametres-escalade.component').then(m => m.ParametresEscaladeComponent) },

            // Fiches d'intervention
            { path: 'exploitation-v2/terrain/interventions', loadComponent: () => import('./adminPage/exploitation-v2/terrain/fiches-intervention/liste-interventions/liste-interventions.component').then(m => m.ListeInterventionsComponent) },
            { path: 'exploitation-v2/terrain/interventions/nouvelle', loadComponent: () => import('./adminPage/exploitation-v2/terrain/fiches-intervention/formulaire-intervention/formulaire-intervention.component').then(m => m.FormulaireInterventionComponent) },
            { path: 'exploitation-v2/terrain/interventions/:id/modifier', loadComponent: () => import('./adminPage/exploitation-v2/terrain/fiches-intervention/formulaire-intervention/formulaire-intervention.component').then(m => m.FormulaireInterventionComponent) },
            { path: 'exploitation-v2/terrain/interventions/:id', loadComponent: () => import('./adminPage/exploitation-v2/terrain/fiches-intervention/fiche-intervention-detail/fiche-intervention-detail.component').then(m => m.FicheInterventionDetailComponent) },

            // Contrôle qualité terrain
            // Note : ordre important — /grilles, /nouveau, /historique/:siteId AVANT /:id
            { path: 'exploitation-v2/terrain/controles', loadComponent: () => import('./adminPage/exploitation-v2/terrain/controle-qualite/liste-controles-terrain/liste-controles-terrain.component').then(m => m.ListeControlesTerrainComponent) },
            { path: 'exploitation-v2/terrain/controles/grilles', loadComponent: () => import('./adminPage/exploitation-v2/terrain/controle-qualite/grilles-evaluation/grilles-evaluation.component').then(m => m.GrillesEvaluationComponent) },
            { path: 'exploitation-v2/terrain/controles/nouveau', loadComponent: () => import('./adminPage/exploitation-v2/terrain/controle-qualite/formulaire-controle-terrain/formulaire-controle-terrain.component').then(m => m.FormulaireControleTerrainComponent) },
            { path: 'exploitation-v2/terrain/controles/historique/:siteId', loadComponent: () => import('./adminPage/exploitation-v2/terrain/controle-qualite/historique-site/historique-site.component').then(m => m.HistoriqueSiteComponent) },
            { path: 'exploitation-v2/terrain/controles/:id', loadComponent: () => import('./adminPage/exploitation-v2/terrain/controle-qualite/fiche-controle-terrain/fiche-controle-terrain.component').then(m => m.FicheControleTerrainComponent) },

            // Matériel
            // Note : ordre important — /nouveau, /maintenance, /:id/historique AVANT /:id
            { path: 'exploitation-v2/terrain/materiel', loadComponent: () => import('./adminPage/exploitation-v2/terrain/materiel/liste-materiel/liste-materiel.component').then(m => m.ListeMaterielComponent) },
            { path: 'exploitation-v2/terrain/materiel/nouveau', loadComponent: () => import('./adminPage/exploitation-v2/terrain/materiel/formulaire-materiel/formulaire-materiel.component').then(m => m.FormulaireMaterielComponent) },
            { path: 'exploitation-v2/terrain/materiel/maintenance', loadComponent: () => import('./adminPage/exploitation-v2/terrain/materiel/suivi-maintenance/suivi-maintenance.component').then(m => m.SuiviMaintenanceComponent) },
            { path: 'exploitation-v2/terrain/materiel/:id/historique', loadComponent: () => import('./adminPage/exploitation-v2/terrain/materiel/historique-materiel/historique-materiel.component').then(m => m.HistoriqueMaterielComponent) },
            { path: 'exploitation-v2/terrain/materiel/:id', loadComponent: () => import('./adminPage/exploitation-v2/terrain/materiel/formulaire-materiel/formulaire-materiel.component').then(m => m.FormulaireMaterielComponent) },

            // Phytosanitaire
            // Note : ordre important — /produits, /registre, /alertes, /applications/nouvelle AVANT /applications/:id
            { path: 'exploitation-v2/terrain/phytosanitaire', loadComponent: () => import('./adminPage/exploitation-v2/terrain/phytosanitaire/calendrier-phyto/calendrier-phyto.component').then(m => m.CalendrierPhytoComponent) },
            { path: 'exploitation-v2/terrain/phytosanitaire/produits', loadComponent: () => import('./adminPage/exploitation-v2/terrain/phytosanitaire/produits-phyto/produits-phyto.component').then(m => m.ProduitsPhytoComponent) },
            { path: 'exploitation-v2/terrain/phytosanitaire/registre', loadComponent: () => import('./adminPage/exploitation-v2/terrain/phytosanitaire/registre-phyto/registre-phyto.component').then(m => m.RegistrePhytoComponent) },
            { path: 'exploitation-v2/terrain/phytosanitaire/alertes', loadComponent: () => import('./adminPage/exploitation-v2/terrain/phytosanitaire/alertes-delais/alertes-delais.component').then(m => m.AlertesDelaisComponent) },
            { path: 'exploitation-v2/terrain/phytosanitaire/applications/nouvelle', loadComponent: () => import('./adminPage/exploitation-v2/terrain/phytosanitaire/formulaire-application/formulaire-application.component').then(m => m.FormulaireApplicationComponent) },
            { path: 'exploitation-v2/terrain/phytosanitaire/applications/:id', loadComponent: () => import('./adminPage/exploitation-v2/terrain/phytosanitaire/formulaire-application/formulaire-application.component').then(m => m.FormulaireApplicationComponent) },

        ]
    }
];
