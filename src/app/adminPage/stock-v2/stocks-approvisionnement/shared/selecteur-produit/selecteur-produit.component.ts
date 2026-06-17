import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  forwardRef,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, finalize, takeUntil } from 'rxjs/operators';

import { StockV2ProduitService } from '../../../../../services/stock-v2-produit.service';
import { Produit } from '../../../../../models/stock-v2-produit.model';
import { LIBELLES_UNITE } from '../../../../../constants/stock.constants';

/**
 * Sélecteur de produit (autocomplete) — Module Stock v2 / 7.3.
 *
 * ControlValueAccessor exposant l'`id` du produit. Émet aussi le `Produit`
 * complet (`produitSelectionne`) pour que le formulaire parent puisse lire
 * l'unité / le prix unitaire sans appel additionnel.
 */
@Component({
  selector: 'app-selecteur-produit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './selecteur-produit.component.html',
  styleUrl: './selecteur-produit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelecteurProduitComponent),
      multi: true,
    },
  ],
})
export class SelecteurProduitComponent implements OnInit, OnDestroy, ControlValueAccessor {

  @Input() placeholder = 'Rechercher un produit (code, libellé)…';
  @Output() produitSelectionne = new EventEmitter<Produit>();

  readonly LIBELLES_UNITE = LIBELLES_UNITE;

  recherche = new FormControl<string>('', { nonNullable: true });
  produitCourant: Produit | null = null;
  resultats: Produit[] = [];
  afficherDropdown = false;
  chargement = false;

  private destroy$ = new Subject<void>();
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};
  private disabled = false;

  constructor(
    private service: StockV2ProduitService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.recherche.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        filter(q => q !== null && q !== this.libelleCourant()),
        takeUntil(this.destroy$),
      )
      .subscribe(q => this.charger(q));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── ControlValueAccessor ───────────────────────────────────────────────

  writeValue(produitId: string | null): void {
    if (!produitId) {
      this.produitCourant = null;
      this.recherche.setValue('', { emitEvent: false });
      this.cdr.markForCheck();
      return;
    }
    this.service.getById(produitId).pipe(takeUntil(this.destroy$)).subscribe({
      next: p => {
        this.produitCourant = p;
        this.recherche.setValue(this.libelleCourant(), { emitEvent: false });
        this.cdr.markForCheck();
      },
    });
  }

  registerOnChange(fn: (value: string | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    isDisabled ? this.recherche.disable() : this.recherche.enable();
    this.cdr.markForCheck();
  }

  // ─── Recherche ──────────────────────────────────────────────────────────

  private charger(q: string): void {
    if (!q || q.trim().length < 2) {
      this.resultats = [];
      this.afficherDropdown = false;
      this.cdr.markForCheck();
      return;
    }
    this.chargement = true;
    this.service.lister(0, 20, { q, actif: true })
      .pipe(
        finalize(() => { this.chargement = false; this.cdr.markForCheck(); }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: res => {
          this.resultats = res.content;
          this.afficherDropdown = true;
          this.cdr.markForCheck();
        },
      });
  }

  selectionner(p: Produit): void {
    this.produitCourant = p;
    this.recherche.setValue(this.libelleCourant(), { emitEvent: false });
    this.resultats = [];
    this.afficherDropdown = false;
    this.onChange(p.id ?? null);
    this.produitSelectionne.emit(p);
    this.cdr.markForCheck();
  }

  effacer(): void {
    if (this.disabled) return;
    this.produitCourant = null;
    this.recherche.setValue('', { emitEvent: false });
    this.resultats = [];
    this.afficherDropdown = false;
    this.onChange(null);
    this.cdr.markForCheck();
  }

  onBlur(): void {
    this.onTouched();
    setTimeout(() => {
      this.afficherDropdown = false;
      const libelle = this.libelleCourant();
      if (this.recherche.value !== libelle) {
        this.recherche.setValue(libelle, { emitEvent: false });
      }
      this.cdr.markForCheck();
    }, 150);
  }

  private libelleCourant(): string {
    if (!this.produitCourant) return '';
    return `${this.produitCourant.code} — ${this.produitCourant.libelle}`;
  }

  trackById(_: number, p: Produit): string {
    return p.id ?? p.code;
  }
}
