import { Component } from '@angular/core';
import { Item } from '../../models/item.model';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { ToastrService } from 'ngx-toastr';
import { DashboardParAgenceService } from '../../services/dashboard-par-agence.service';

@Component({
  selector: 'app-statistique-par-agence-groupe',
  imports: [CommonModule],
  templateUrl: './statistique-par-agence-groupe.component.html',
  styleUrl: './statistique-par-agence-groupe.component.scss'
})
export class StatistiqueParAgenceGroupeComponent {


agencyGroups: string[] = [];
selectedGroup: string | null = null;

stats: { [agency: string]: { total: number; present: number; absent: number } } = {};
filteredStats: typeof this.stats = {};


  // Données complètes (API)
  items: Item[] = [];

  // Résultat filtré
  filteredItems: Item[] = [];

  // État actuel
  selectedType: string | null = null;

  ngOnInit() {
    this.loadData();
  }

  constructor(private dashboard: DashboardParAgenceService, private toastr: ToastrService) {}

  loadData() {
  this.dashboard.getDashboardData().subscribe({
    next: data => {
      this.stats = data;
      this.filteredStats = data;

      // Extraire UBA, BGFI, SGS sans doublons
      this.agencyGroups = [
        ...new Set(
          Object.keys(data).map(key => key.split(' ')[0])
        )
      ];
    },
    error: () => {
      this.toastr.error('Failed to load dashboard data', 'Error');
    }
  });
}


  filterByGroup(group: string) {
  this.selectedGroup = group;

  this.filteredStats = Object.fromEntries(
    Object.entries(this.stats).filter(
      ([agency]) => agency.startsWith(group)
    )
  );
}


  reset() {
  this.selectedGroup = null;
  this.filteredStats = this.stats;
}


}
