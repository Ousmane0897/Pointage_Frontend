import { Component, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { LoginService } from '../../services/login.service';
import { SuperAdminComponent } from '../super-admin/super-admin.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterModule,
    RouterOutlet,
    CommonModule,
    SuperAdminComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  prenomNom: string | null = null;
  role: string | null = null;
  poste: string | null = null;

  stats: { total: number; present: number; absent: number } | null = null;

  constructor(private dashboardService: DashboardService,
    private toastr: ToastrService, private loginService: LoginService
  ) {}

  ngOnInit(): void {
    this.dashboardService.getDashboardData().subscribe(data => {
      this.stats = data;
    }, error => {
      this.toastr.error('Failed to load dashboard data', 'Error');
      console.error('Error fetching dashboard stats:', error);
    });

    this.prenomNom = this.loginService.getFirstNameLastName();
    this.role = this.loginService.getUserRole();
    this.poste = this.loginService.getUserPoste();
  
  }

}
