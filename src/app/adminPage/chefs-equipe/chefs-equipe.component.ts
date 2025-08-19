import { Component } from '@angular/core';
import { EmployeService } from '../../services/employe.service';
import { Employe } from '../../models/employe.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-chefs-equipe',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './chefs-equipe.component.html',
  styleUrl: './chefs-equipe.component.scss'
})
export class ChefsEquipeComponent {

  
  
    employes: Employe[] = [];
    searchText: string = '';
    employeCreePar!: string | null;
    
  
    
  
    constructor(private employeService: EmployeService, private loginService: LoginService
    ) {}
  
   ngOnInit(): void {
      this.loadData();
      this.employeCreePar = this.loginService.getFirstNameLastName();
    
    }

  
    loadData() {
     this.employeService.getEmployesChefsEquipe().subscribe(data => {
        this.employes = data;
        console.log('Chefs d\'équipe:', this.employes);
        });
    }

  
    
  
  
     get filteredEmployes() {
      const term = this.searchText.toLowerCase();
      return this.employes.filter(employe =>
        `${employe.codeSecret} ${employe.prenom} ${employe.nom} ${employe.numero} ${employe.intervention} ${employe.statut} ${employe.employeCreePar} ${employe.site}`
          .toLowerCase()
          .includes(term)
      );
    }
  
    
  
  
  
   
  
}
