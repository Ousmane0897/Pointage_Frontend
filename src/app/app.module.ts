import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

// ✅ Import MatCardModule

import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';

@NgModule({
  
  imports: [
    MatIconModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes) // Configure les routes à la racine de l'application

  ],
 
})
export class AppModule { }
