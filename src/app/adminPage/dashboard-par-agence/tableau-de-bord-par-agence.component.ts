import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { DashboardParAgenceService } from '../../services/dashboard-par-agence.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-tableau-de-bord-par-agence',
    imports: [
        CommonModule
    ],
    templateUrl: './tableau-de-bord-par-agence.component.html',
    styleUrl: './tableau-de-bord-par-agence.component.scss'
})
export class TableauDeBordParAgenceComponent implements OnInit {

  stats: {[site: string] :  { total: number; present: number; absent: number }} = {};

  constructor(private toastr: ToastrService, private dashboard: DashboardParAgenceService) { }

  ngOnInit(): void {
    
    this.loadData();
  }

 loadData() {
    this.dashboard.getDashboardData().subscribe(data => {
      this.stats = data;
      console.log('Dashboard stats:', this.stats);
    }, error => {
      this.toastr.error('Failed to load dashboard data', 'Error');
      console.error('Error fetching dashboard stats:', error);
    });
  }

}





