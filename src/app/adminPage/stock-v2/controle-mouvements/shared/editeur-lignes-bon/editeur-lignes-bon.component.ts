import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { SelecteurProduitComponent } from '../../../stocks-approvisionnement/shared/selecteur-produit/selecteur-produit.component';
import { Produit } from '../../../../../models/stock-v2-produit.model';
import { LIBELLES_UNITE, DEVISE } from '../../../../../constants/stock.constants';

/** Crée un FormGroup de ligne de bon (produit + quantité + métadonnées d'affichage). */
export function creerLigneBon(data?: {
  produitId?: string;
  produitCode?: string;
  produitLibelle?: string;
  unite?: string;
  prixUnitaire?: number | null;
  quantite?: number | null;
}): FormGroup {
  return new FormGroup({
    produitId: new FormControl(data?.produitId ?? '', { nonNullable: true, validators: [Validators.required] }),
    produitCode: new FormControl(data?.produitCode ?? '', { nonNullable: true }),
    produitLibelle: new FormControl(data?.produitLibelle ?? '', { nonNullable: true }),
    unite: new FormControl(data?.unite ?? '', { nonNullable: true }),
    prixUnitaire: new FormControl<number | null>(data?.prixUnitaire ?? null),
    quantite: new FormControl<number | null>(data?.quantite ?? null, [Validators.required, Validators.min(0.0001)]),
  });
}

/**
 * Éditeur de lignes de bon — Module Stock v2 / 7.4.
 *
 * Manipule un `FormArray` fourni par le parent (formulaire bon entrée/sortie).
 * Chaque ligne réutilise le `SelecteurProduitComponent` de 7.3. Le parent ne
 * transmet au serveur que { produitId, quantite } ; les autres champs servent à
 * l'affichage et au calcul du montant.
 */
@Component({
  selector: 'app-editeur-lignes-bon',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, SelecteurProduitComponent],
  templateUrl: './editeur-lignes-bon.component.html',
  styleUrl: './editeur-lignes-bon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditeurLignesBonComponent {

  @Input({ required: true }) lignes!: FormArray;

  readonly LIBELLES_UNITE = LIBELLES_UNITE;
  readonly DEVISE = DEVISE;

  constructor(private cdr: ChangeDetectorRef) {}

  get groupes(): FormGroup[] {
    return this.lignes.controls as FormGroup[];
  }

  ajouter(): void {
    this.lignes.push(creerLigneBon());
    this.cdr.markForCheck();
  }

  supprimer(i: number): void {
    this.lignes.removeAt(i);
    this.cdr.markForCheck();
  }

  onProduit(i: number, p: Produit): void {
    this.groupes[i].patchValue({
      produitId: p.id ?? '',
      produitCode: p.code,
      produitLibelle: p.libelle,
      unite: p.unite,
      prixUnitaire: p.prixUnitaire ?? null,
    }, { emitEvent: false });
    this.cdr.markForCheck();
  }

  montantLigne(g: FormGroup): number {
    const q = Number(g.get('quantite')?.value) || 0;
    const pu = Number(g.get('prixUnitaire')?.value) || 0;
    return q * pu;
  }

  total(): number {
    return this.groupes.reduce((s, g) => s + this.montantLigne(g), 0);
  }

  uniteLigne(g: FormGroup): string {
    const u = g.get('unite')?.value as keyof typeof LIBELLES_UNITE | '';
    return u ? (LIBELLES_UNITE[u] ?? '') : '';
  }

  trackByIndex(i: number): number {
    return i;
  }
}
