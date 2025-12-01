import { Routes } from '@angular/router';
import { PageCodePinComponent } from './page-code-pin/page-code-pin.component';
import { HomePageComponent } from './home-page/home-page.component';
import { FinalPage1Component } from './final-page1/final-page1.component';
import { FinalPage2Component } from './final-page2/final-page2.component';
import { DashboardComponent } from './adminPage/dashboard/dashboard.component';
import { AdminComponent } from './adminPage/admin/admin.component';
import { AuthGuard } from './guards/auth.guard';


export const routes: Routes = [
    { path: '', loadComponent: () => import('./home-page/home-page.component').then(m => m.HomePageComponent) }, // lazy loading de la page d'accueil
    { path: 'home', loadComponent: () => import('./home-page/home-page.component').then(m => m.HomePageComponent) }, // lazy loading de la page d'accueil
    { path: 'code-pin', loadComponent: () => import('./page-code-pin/page-code-pin.component').then(m => m.PageCodePinComponent) }, // lazy loading de la page code pin
    { path: 'pagefinal1/:codeSecret', loadComponent: () => import('./final-page1/final-page1.component').then(m => m.FinalPage1Component) }, // lazy loading de la page final 1
    { path: 'pagefinal2/:codeSecret', loadComponent: () => import('./final-page2/final-page2.component').then(m => m.FinalPage2Component) }, // lazy loading de la page final 2
    {
        path: 'super-admin-login', loadComponent: () => import('./super-admin-login-page/super-admin-login-page.component').then(m => m.SuperAdminLoginPageComponent), // lazy loading de la page de connexion du super admin
    },
    {
        path: 'admin', loadComponent: () => import('./adminPage/admin/admin.component').then(m => m.AdminComponent), // lazy loading de la page admin

        canActivate: [AuthGuard], // protection de la route admin avec AuthGuard
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // redirection vers la page dashboard par défaut
            { path: 'dashboard', loadComponent: () => import('./adminPage/dashboard/dashboard.component').then(m => m.DashboardComponent) }, // lazy loading de la page dashboard
            { path: 'dashboard-par-agence', loadComponent: () => import('./adminPage/dashboard-par-agence/tableau-de-bord-par-agence.component').then(m => m.TableauDeBordParAgenceComponent) }, // lazy loading de la page tableau de bord par agence
            { path: 'planification', loadComponent: () => import('./adminPage/planification/planification.component').then(m => m.PlanificationComponent) }, // lazy loading de la page planification
            { path: 'gestion-superviseurs', loadComponent: () => import('./adminPage/superviseur/superviseur.component').then(m => m.SuperviseurComponent) }, // lazy loading de la page gestion superviseurs
            { path: 'calendrier', loadComponent: () => import('./adminPage/calendrier/calendrier.component').then(m => m.CalendrierComponent) },
            //{ path: 'employes', loadComponent: () => import('./adminPage/employes/employes.component').then(m => m.EmployesComponent) }, // lazy loading de la page employes
            { path: 'employes/donnees-complet', loadComponent: () => import('./adminPage/employes-complet/employes-complet.component').then(m => m.EmployesCompletComponent) }, // lazy loading de la page employes complet
            { path: 'employes/donnees-partiel', loadComponent: () => import('./adminPage/employes/employes.component').then(m => m.EmployesComponent) }, // lazy loading de la page données employé
            { path: 'collecte-et-livraison/collecte-des-besoins', loadComponent: () => import('./adminPage/collecte et livraison/collecte-des-besoins/collecte-des-besoins.component').then(m => m.CollecteDesBesoinsComponent) }, // lazy loading de la page collecte des besoins
            { path: 'collecte-et-livraison/suivi-livraison', loadComponent: () => import('./adminPage/collecte et livraison/suivi-commandes/suivi-commandes.component').then(m => m.SuiviCommandesComponent) }, // lazy loading de la page livraison des besoins
            { path: 'collecte-et-livraison/livraison-demandes', loadComponent: () => import('./adminPage/collecte et livraison/livraison-demandes/livraison-demandes.component').then(m => m.LivraisonDemandesComponent) }, // lazy loading de la page livraison des demandes
            { path: 'collecte-et-livraison/historique-livraisons', loadComponent: () => import('./adminPage/collecte et livraison/historique-livraisons/historique-livraisons.component').then(m => m.HistoriqueLivraisonsComponent) }, // lazy loading de la page historique des livraisons
            { path: 'stock/entrees', loadComponent: () => import('./adminPage/stock/entrees/entrees.component').then(m => m.EntreesComponent) }, // lazy loading de la page entrees
            { path: 'stock/sorties', loadComponent: () => import('./adminPage/stock/sorties/sorties.component').then(m => m.SortiesComponent) }, // lazy loading de la page sorties
            { path: 'stock/produits', loadComponent: () => import('./adminPage/stock/produit-list/produit-list.component').then(m => m.ProduitListComponent) }, // lazy loading de la page produits
            { path: 'stock/historiques-entrees', loadComponent: () => import('./adminPage/stock/historiques-entrees/historiques-entrees.component').then(m => m.HistoriquesEntreesComponent) }, // lazy loading de la page historiques entrées
            { path: 'stock/historiques-sorties', loadComponent: () => import('./adminPage/stock/historiques-sorties/historiques-sorties.component').then(m => m.HistoriquesSortiesComponent) }, // lazy loading de la page historiques sorties
            //{ path: 'stock/rapports-mensuels', loadComponent: () => import('./adminPage/stock/rapport-mensuel/rapport-mensuel.component').then(m => m.RapportMensuelComponent) }, // lazy loading de la page rapports mensuels
            { path: 'stock/suivi', loadComponent: () => import('./adminPage/stock/suivi-stock/suivi-stock.component').then(m => m.SuiviStockComponent) }, // lazy loading de la page suivi
            { path: 'stock/rapports-statistiques', loadComponent: () => import('./adminPage/stock/rapports-et-statistiques/rapports-et-statistiques.component').then(m => m.RapportsEtStatistiquesComponent) }, // lazy loading de la page rapports
            { path: 'stockage', loadComponent: () => import('./adminPage/stockage/stockage.component').then(m => m.StockageComponent) }, // lazy loading de la page stockage
            { path: 'feries', loadComponent: () => import('./adminPage/ferie/ferie.component').then(m => m.FerieComponent) }, // lazy loading de la page feries
            {
                path: 'gestion-privilege', loadComponent: () => import('./adminPage/gestion-privilege/gestion-privilege.component').then(m => m.GestionPrivilegeComponent),
                children: [
                    {
                        path: 'cheffes-equipe', loadComponent: () => import('./adminPage/chefs-equipe/chefs-equipe.component').then(m => m.ChefsEquipeComponent)
                    }
                ]
            }, // lazy loading de la page gestion privilege
            { path: 'pointages', loadComponent: () => import('./adminPage/pointages/pointages.component').then(m => m.PointagesComponent) }, // lazy loading de la page pointages
            { path: 'agences', loadComponent: () => import('./adminPage/agences/agences.component').then(m => m.AgencesComponent) }, // lazy loading de la page agences
            { path: 'parametres', loadComponent: () => import('./adminPage/parametres/parametres.component').then(m => m.ParametresComponent) }, // lazy loading de la page parametres
            { path: 'absences/tempsreel', loadComponent: () => import('./adminPage/absences-temps-reel/absences-temps-reel.component').then(m => m.AbsencesTempsReelComponent) }, // lazy loading de la page absences
            { path: 'absences/historique', loadComponent: () => import('./adminPage/absences-historique/absences-historique.component').then(m => m.AbsencesHistoriqueComponent) }, // lazy loading de la page absences
            //{ path: 'absences', loadComponent: () => import('./adminPage/absences/absences.component').then(m => m.AbsencesComponent) }, // lazy loading de la page absences
            

        ]
    }
];
