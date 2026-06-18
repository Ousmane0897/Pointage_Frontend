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
import { takeUntil } from 'rxjs/operators';

import { StockV2AnalyseChantierService } from '../../../../../services/stock-v2-analyse-chantier.service';
import { Chantier } from '../../../../../models/stock-v2-chantier.model';

/**
 * Sélecteur de chantier (autocomplete) — Module Stock v2 / 7.5.
 *
 * Réutilisé par le formulaire de bon de sortie 7.4 (rattachement d'une sortie
 * DISTRIBUTION_CHANTIER à un chantier). Charge les chantiers EN_COURS une fois
 * puis filtre côté client. Expose l'`id` via ControlValueAccessor et émet le
 * `Chantier` complet (`chantierSelectionne`).
 */
@Component({
  selector: 'app-selecteur-chantier',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './selecteur-chantier.component.html',
  styleUrl: './selecteur-chantier.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelecteurChantierComponent),
      multi: true,
    },
  ],
})
export class SelecteurChantierComponent implements OnInit, OnDestroy, ControlValueAccessor {

  @Input() placeholder = 'Rechercher un chantier…';
  @Output() chantierSelectionne = new EventEmitter<Chantier | null>();

  recherche = new FormControl<string>('', { nonNullable: true });
  chantierCourant: Chantier | null = null;

  private tousLesChantiers: Chantier[] = [];
  resultats: Chantier[] = [];
  afficherDropdown = false;
  chargement = false;

  private destroy$ = new Subject<void>();
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};
  private disabled = false;

  constructor(
    private service: StockV2AnalyseChantierService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.chargement = true;
    this.service.listerActifs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: chantiers => {
          this.tousLesChantiers = chantiers ?? [];
          this.chargement = false;
          this.cdr.markForCheck();
        },
        error: () => { this.chargement = false; this.cdr.markForCheck(); },
      });

    this.recherche.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(q => this.filtrer(q));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── ControlValueAccessor ───────────────────────────────────────────────

  writeValue(chantierId: string | null): void {
    if (!chantierId) {
      this.chantierCourant = null;
      this.recherche.setValue('', { emitEvent: false });
      this.cdr.markForCheck();
      return;
    }
    const dejaCharge = this.tousLesChantiers.find(c => c.id === chantierId);
    if (dejaCharge) {
      this.appliquerCourant(dejaCharge);
      return;
    }
    this.service.getDetail(chantierId).pipe(takeUntil(this.destroy$)).subscribe({
      next: d => this.appliquerCourant(d.chantier),
    });
  }

  registerOnChange(fn: (value: string | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    isDisabled ? this.recherche.disable() : this.recherche.enable();
    this.cdr.markForCheck();
  }

  // ─── Recherche (client-side) ────────────────────────────────────────────

  private filtrer(q: string): void {
    const terme = (q ?? '').trim().toLowerCase();
    if (terme === this.libelleCourant().toLowerCase()) return;
    if (!terme) {
      this.resultats = [];
      this.afficherDropdown = false;
      this.cdr.markForCheck();
      return;
    }
    this.resultats = this.tousLesChantiers
      .filter(c =>
        c.nom.toLowerCase().includes(terme) ||
        c.reference.toLowerCase().includes(terme) ||
        (c.client ?? '').toLowerCase().includes(terme))
      .slice(0, 20);
    this.afficherDropdown = true;
    this.cdr.markForCheck();
  }

  private appliquerCourant(c: Chantier): void {
    this.chantierCourant = c;
    this.recherche.setValue(this.libelleCourant(), { emitEvent: false });
    this.cdr.markForCheck();
  }

  selectionner(c: Chantier): void {
    this.chantierCourant = c;
    this.recherche.setValue(this.libelleCourant(), { emitEvent: false });
    this.resultats = [];
    this.afficherDropdown = false;
    this.onChange(c.id ?? null);
    this.chantierSelectionne.emit(c);
    this.cdr.markForCheck();
  }

  effacer(): void {
    if (this.disabled) return;
    this.chantierCourant = null;
    this.recherche.setValue('', { emitEvent: false });
    this.resultats = [];
    this.afficherDropdown = false;
    this.onChange(null);
    this.chantierSelectionne.emit(null);
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
    if (!this.chantierCourant) return '';
    return `${this.chantierCourant.reference} — ${this.chantierCourant.nom}`;
  }

  trackById(_: number, c: Chantier): string {
    return c.id ?? c.reference;
  }
}
