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

import { TerrainSiteClientService } from '../../../../../services/terrain-site-client.service';
import { SiteClient } from '../../../../../models/terrain-site-client.model';

/**
 * Sélecteur de site (autocomplete) — Module Stock v2 / 7.3.
 *
 * Consomme `TerrainSiteClientService` en LECTURE SEULE (seule dépendance
 * externe encadrée du module Stock). Charge les sites actifs une fois puis
 * filtre côté client. Expose l'`id` du site via ControlValueAccessor et émet
 * le `SiteClient` complet (`siteSelectionne`).
 *
 * IMPORTANT : aucune écriture sur le référentiel sites — le module Stock ne
 * crée ni ne modifie jamais un site.
 */
@Component({
  selector: 'app-selecteur-site',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './selecteur-site.component.html',
  styleUrl: './selecteur-site.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelecteurSiteComponent),
      multi: true,
    },
  ],
})
export class SelecteurSiteComponent implements OnInit, OnDestroy, ControlValueAccessor {

  @Input() placeholder = 'Rechercher un site…';
  @Output() siteSelectionne = new EventEmitter<SiteClient | null>();

  recherche = new FormControl<string>('', { nonNullable: true });
  siteCourant: SiteClient | null = null;

  private tousLesSites: SiteClient[] = [];
  resultats: SiteClient[] = [];
  afficherDropdown = false;
  chargement = false;

  private destroy$ = new Subject<void>();
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};
  private disabled = false;

  constructor(
    private service: TerrainSiteClientService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.chargement = true;
    this.service.listerActifs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: sites => {
          this.tousLesSites = sites ?? [];
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

  writeValue(siteId: string | null): void {
    if (!siteId) {
      this.siteCourant = null;
      this.recherche.setValue('', { emitEvent: false });
      this.cdr.markForCheck();
      return;
    }
    const dejaCharge = this.tousLesSites.find(s => s.id === siteId);
    if (dejaCharge) {
      this.appliquerCourant(dejaCharge);
      return;
    }
    this.service.getById(siteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: s => this.appliquerCourant(s),
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
    this.resultats = this.tousLesSites
      .filter(s =>
        s.nom.toLowerCase().includes(terme) ||
        s.code.toLowerCase().includes(terme) ||
        (s.ville ?? '').toLowerCase().includes(terme))
      .slice(0, 20);
    this.afficherDropdown = true;
    this.cdr.markForCheck();
  }

  private appliquerCourant(s: SiteClient): void {
    this.siteCourant = s;
    this.recherche.setValue(this.libelleCourant(), { emitEvent: false });
    this.cdr.markForCheck();
  }

  selectionner(s: SiteClient): void {
    this.siteCourant = s;
    this.recherche.setValue(this.libelleCourant(), { emitEvent: false });
    this.resultats = [];
    this.afficherDropdown = false;
    this.onChange(s.id ?? null);
    this.siteSelectionne.emit(s);
    this.cdr.markForCheck();
  }

  effacer(): void {
    if (this.disabled) return;
    this.siteCourant = null;
    this.recherche.setValue('', { emitEvent: false });
    this.resultats = [];
    this.afficherDropdown = false;
    this.onChange(null);
    this.siteSelectionne.emit(null);
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
    if (!this.siteCourant) return '';
    return `${this.siteCourant.nom}${this.siteCourant.ville ? ' — ' + this.siteCourant.ville : ''}`;
  }

  trackById(_: number, s: SiteClient): string {
    return s.id ?? s.code;
  }
}
