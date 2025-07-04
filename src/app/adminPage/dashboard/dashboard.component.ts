import { Component, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterModule,
    RouterOutlet,
    CommonModule,

  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  stats: { total: number; present: number; absent: number } | null = null;

  constructor(private dashboardService: DashboardService,
    private toastr: ToastrService,
  ) { }

  ngOnInit(): void {
    this.dashboardService.getDashboardData().subscribe(data => {
      this.stats = data;
    }, error => {
      this.toastr.error('Failed to load dashboard data', 'Error');
      console.error('Error fetching dashboard stats:', error);
    });
  }

}
