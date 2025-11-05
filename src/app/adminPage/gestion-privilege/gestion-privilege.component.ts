import { Component, OnInit } from '@angular/core';
import { Admin } from '../../models/admin.model';
import { AdminService } from '../../services/admin.service';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { HttpClientModule } from '@angular/common/http';
import { LoginService } from '../../services/login.service';
import { Router, RouterOutlet } from '@angular/router';
import {} from '@angular/common/http';

@Component({
    selector: 'app-gestion-privilege',
    imports: [
        FormsModule,
        CommonModule,
        // TODO: `HttpClientModule` should not be imported into a component directly.
        // Please refactor the code to add `provideHttpClient()` call to the provider list in the
        // application bootstrap logic and remove the `HttpClientModule` import from this component.
        HttpClientModule,
        RouterOutlet
    ],
    templateUrl: './gestion-privilege.component.html',
    styleUrl: './gestion-privilege.component.scss'
})
export class GestionPrivilegeComponent implements OnInit {

  admins: Admin[] = [];
   selectedAdmin: Admin | null = null;
   searchText: string = '';
   showModal = false;
   showPassword: boolean = false;
   modalData: Admin = {
     identifiant: '',
     prenom: '',
     nom: '',
     email: '',
     password: '',
     poste: '',
     role: '',
     motifDesactivation: '',
     active: true,
 
   }
   isEditMode = false;
   selectedId: string | null = null;
 
   constructor(private adminService: AdminService,
     private dialog: MatDialog, private toastr: ToastrService,
     private loginService: LoginService, private router: Router
   ) { }
 
   ngOnInit(): void {
     this.loadData();
   }
 
 
   loadData() {
     this.adminService.getAdmins().subscribe(data => {
       this.admins = data;
     });
   }

   
 
 
 
   openAddModal() {
     this.isEditMode = false;
     this.modalData = { identifiant: '', prenom: '', nom: '', email: '', password: '', poste:'', role:'', motifDesactivation:'', active: true };
     this.selectedId = null;
     this.showModal = true;
   }
 
   openEditModal(admin: Admin) {
     this.isEditMode = true;
     this.modalData = { ...admin };
     this.selectedId = admin.identifiant;
     this.showModal = true;
   }
 
   closeModal() {
     this.showModal = false;
   }
 
   saveModal(form: NgForm) {
     if (form.invalid) {
       // Marquer tous les champs comme touchés pour afficher les erreurs
       Object.values(form.controls).forEach(control => {
         control.markAsTouched();
       });
 
       this.toastr.error('Veuillez remplir tous les champs obligatoires.', 'Erreur');
       return;
     }
     if (this.isEditMode && this.selectedId) {
       this.adminService.updateAdmin(this.selectedId, this.modalData).subscribe(() => {
         this.loadData();
         this.closeModal();
         this.toastr.success('Admin mis à jour avec succès !', 'Succès');
       });
     } else {
       this.adminService.createAdmin(this.modalData).subscribe({
         next: () => {
           this.loadData();
           this.closeModal();
           this.toastr.success('Admin créé avec succès !', 'Succès');
         },
         error: (err) => {
           console.error('Erreur de création de l\'admin :', err);
           this.toastr.error('Erreur lors de la création de l\'admin', 'Erreur');
 
         }
 
       });
     }
   }
 
   get filteredAdmins() {
     const term = this.searchText.toLowerCase();
     return this.admins.filter(employe =>
       `${employe.identifiant} ${employe.prenom} ${employe.nom} ${employe.email} ${employe.password} ${employe.poste} ${employe.role} ${employe.motifDesactivation} ${employe.active}`
         .toLowerCase()
         .includes(term)
     );
   }
   toggleStatus(admin: Admin): void {
     const updated = { ...admin, active: !admin.active };
     this.adminService.updateAdmin(admin.identifiant!, updated).subscribe({
       next: () => {
         this.toastr.success(`Admin ${updated.active ? 'activé' : 'désactivé'} avec succès !`, 'Succès');
         this.loadData();
       },
       error: (err) => {
         console.error('Erreur de mise à jour du statut :', err);
         this.toastr.error('Erreur lors de la mise à jour du statut de l\'admin', 'Erreur');
       }
     });
   }
 
   logout() {
     this.loginService.logout();
   }
 
   togglePasswordVisibility() {
     this.showPassword = !this.showPassword;
   }

   cheffesEquipe() {
     this.router.navigate(['/admin/gestion-privilege/cheffes-equipe']);
   }
 
 
   deleteRow(identifiant: string) {
     const dialogRef = this.dialog.open(ConfirmDialogComponent, {
       width: '350px',
       data: { message: "Êtes-vous sûr de vouloir supprimer cet admin ?" },
     });
 
     dialogRef.afterClosed().subscribe(result => {
       if (result) {
         this.adminService.deleteAdmin(identifiant).subscribe({
           next: () => {
             this.loadData();
             this.toastr.success('admin supprimé avec succès !', 'Succès');
           },
           error: (err) => {
             console.error('Erreur de suppression :', err);
             this.toastr.error('Erreur lors de la suppression de l\'admin', 'Erreur');
           }
         });
       }
     });
   }

}
