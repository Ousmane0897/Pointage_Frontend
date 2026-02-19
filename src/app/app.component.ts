import { CommonModule } from '@angular/common';
import { Component, OnInit, } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxSpinnerComponent, NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { LoginService } from './services/login.service';


@Component({
    selector: 'app-root',
    imports: [
        CommonModule,
        RouterModule,
        NgxSpinnerComponent
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {


    ngOnInit() {
        const token = localStorage.getItem('token');

        if (token && this.authService.isTokenExpired(token)) {
            this.authService.logout();
        }
    }


    constructor(private authService: LoginService) {

    }
}
