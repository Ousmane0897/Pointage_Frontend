import './polyfills';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { Chart, registerables } from 'chart.js';

// ⚡ Important : enregistre tous les contrôleurs, éléments et plugins
Chart.register(...registerables);



bootstrapApplication(AppComponent,appConfig)
.catch(err => console.error(err));
