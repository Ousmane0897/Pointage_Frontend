import { Component } from '@angular/core';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { HeaderComponent } from '../header/header.component';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-admin',
    imports: [
        HeaderComponent,
        SidebarComponent,
        RouterOutlet
    ],
    templateUrl: './admin.component.html',
    styleUrl: './admin.component.scss'
})
export class AdminComponent {

}
