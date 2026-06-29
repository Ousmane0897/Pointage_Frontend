import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, catchError, finalize, of, takeUntil } from 'rxjs';

import { StockV2ImportExcelService } from '../../../../../services/stock-v2-import-excel.service';
import { StockV2ProduitService } from '../../../../../services/stock-v2-produit.service';
import {
  ErreurImport,
  ResultatImport,
  ResultatValidation,
} from '../../../../../models/stock-v2-import.model';

type Stage = 'upload' | 'validation' | 'preview' | 'import' | 'resultat';

@Component({
  selector: 'app-import-produits-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, LucideAngularModule],
  templateUrl: './import-produits-modal.component.html',
  styleUrl: './import-produits-modal.component.scss',
})
export class ImportProduitsModalComponent implements OnDestroy {

  stage: Stage = 'upload';

  selectedFile: File | null = null;
  dragOver = false;

  validation: ResultatValidation | null = null;
  enTetesManquants: string[] = [];
  enTetesTrouves: string[] = [];

  resultatImport: ResultatImport | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<ImportProduitsModalComponent, ResultatImport | null>,
    private importService: StockV2ImportExcelService,
    private produitService: StockV2ProduitService,
    private toastr: ToastrService,
  ) {}

  telechargerTemplate(): void {
    this.importService.genererTemplate();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.dragOver = true; }
  onDragLeave(): void { this.dragOver = false; }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const f = event.dataTransfer.files[0];
      if (this.estFichierExcel(f)) this.selectedFile = f;
      else this.toastr.warning('Format non supporté — utilisez un fichier .xlsx ou .xls.', 'Fichier invalide');
    }
  }

  retirerFichier(): void { this.selectedFile = null; }

  private estFichierExcel(f: File): boolean {
    const nom = f.name.toLowerCase();
    return nom.endsWith('.xlsx') || nom.endsWith('.xls');
  }

  formatFileSize(bytes?: number): string {
    if (bytes === undefined || bytes === null) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  analyser(): void {
    if (!this.selectedFile) return;
    this.stage = 'validation';
    this.enTetesManquants = [];
    this.enTetesTrouves = [];

    this.importService.lireFichier(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ rows, enTetesManquants, enTetesTrouves }) => {
          if (enTetesManquants.length > 0) {
            this.enTetesManquants = enTetesManquants;
            this.enTetesTrouves = enTetesTrouves;
            this.stage = 'upload';
            this.toastr.error('Le fichier ne correspond pas au modèle attendu. Téléchargez à nouveau le modèle Excel.', 'Structure invalide');
            return;
          }
          if (rows.length === 0) {
            this.stage = 'upload';
            this.toastr.warning("Le fichier ne contient aucune ligne de données à importer.", 'Fichier vide');
            return;
          }
          this.importService.validerLignes(rows)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: validation => { this.validation = validation; this.stage = 'preview'; },
              error: () => { this.stage = 'upload'; this.toastr.error('Erreur lors de la validation du fichier.', 'Erreur'); },
            });
        },
        error: () => { this.stage = 'upload'; this.toastr.error("Impossible de lire le fichier Excel.", 'Erreur'); },
      });
  }

  lancerImport(): void {
    if (!this.validation) return;
    const lignesValides = this.validation.lignes.filter(l => l.erreurs.length === 0 && l.payload);
    if (lignesValides.length === 0) {
      this.toastr.warning("Aucune ligne valide à importer.", 'Rien à importer');
      return;
    }

    const payload = this.importService.construirePayload(lignesValides);
    this.stage = 'import';

    this.produitService.importerBulk(payload)
      .pipe(
        catchError(err => {
          console.error('Erreur import bulk produits :', err);
          this.toastr.error(err?.error?.message ?? "Erreur lors de l'import. Aucun produit n'a été créé.", 'Erreur');
          return of<ResultatImport>({ succes: 0, echecs: [] });
        }),
        finalize(() => { if (this.stage !== 'resultat') this.stage = 'resultat'; }),
        takeUntil(this.destroy$),
      )
      .subscribe(resultat => {
        this.resultatImport = resultat;
        this.stage = 'resultat';
        if (resultat.succes > 0) {
          this.toastr.success(`${resultat.succes} produit${resultat.succes > 1 ? 's' : ''} créé${resultat.succes > 1 ? 's' : ''} avec succès.`, 'Import réussi');
        }
      });
  }

  exporterRapportValidation(): void {
    if (!this.validation) return;
    this.importService.exporterRapportErreurs(this.validation.erreurs);
  }

  exporterRapportServeur(): void {
    if (!this.resultatImport) return;
    const erreurs: ErreurImport[] = this.resultatImport.echecs.map(e => ({
      numeroLigne: e.numeroLigne,
      colonne: 'Serveur',
      valeurRecue: e.code,
      message: e.message,
    }));
    this.importService.exporterRapportErreurs(erreurs);
  }

  retourUpload(): void { this.stage = 'upload'; this.validation = null; }
  annuler(): void { this.dialogRef.close(null); }
  fermer(): void { this.dialogRef.close(this.resultatImport); }

  get aDesErreurs(): boolean { return !!this.validation && this.validation.enErreur > 0; }
  get peutImporter(): boolean { return !!this.validation && this.validation.valides > 0; }

  trackErreur(_: number, e: ErreurImport): string { return `${e.numeroLigne}-${e.colonne}`; }

  afficherValeur(v: unknown): string {
    if (v === null || v === undefined || v === '') return '';
    return String(v);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
