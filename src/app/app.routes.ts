import { Routes } from '@angular/router';
import { PageCodePinComponent } from './page-code-pin/page-code-pin.component';
import { HomePageComponent } from './home-page/home-page.component';
import { FinalPage1Component } from './final-page1/final-page1.component';
import { FinalPage2Component } from './final-page2/final-page2.component';
import { DashboardComponent } from './adminPage/dashboard/dashboard.component';
import { AdminComponent } from './adminPage/admin/admin.component';


export const routes: Routes = [
    {path:'', component: HomePageComponent},
    {path:'code-pin', component: PageCodePinComponent},
    {path:'pagefinal1', component: FinalPage1Component},
    {path:'pagefinal2', component: FinalPage2Component},
    {path:'admin', component: AdminComponent,
     children: [
        {path:'', redirectTo:'dashboard', pathMatch: 'full'}, // redirige vers la page /admin/dashboard si on tape la route racine '/admin' dans l'url car contenant des routes enfants
        {path:'dashboard', component: DashboardComponent}
        
     ]
    }
];
