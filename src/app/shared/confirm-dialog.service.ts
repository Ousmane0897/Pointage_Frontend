import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../shared/confirm-dialog/confirm-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  constructor(private dialog: MatDialog) {}

  confirm(data: ConfirmDialogData): Observable<string | null> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data
    });
    return dialogRef.afterClosed(); // va renvoyer soit le texte, soit null
  }
}
