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

import { DossierEmployeService } from '../../../../../services/dossier-employe.service';
import { DossierEmploye } from '../../../../../models/dossier-employe.model';

/**
 * Sélecteur d'employé (autocomplete) — Module Stock v2 / 7.4.
 *
 * ControlValueAccessor exposant l'`id` de l'employé. Consomme
 * `DossierEmployeService` (module RH) en LECTURE SEULE pour identifier le
 * demandeur d'un bon et le validateur (Responsable Achats — visible via le
 * poste affiché). Émet le `DossierEmploye` complet (`employeSelectionne`).
 */
@Component({
  selector: 'app-selecteur-employe',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './selecteur-employe.component.html',
  styleUrl: './selecteur-employe.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelecteurEmployeComponent),
      multi: true,
    },
  ],
})
export class SelecteurEmployeComponent implements OnInit, OnDestroy, ControlValueAccessor {

  @Input() placeholder = 'Rechercher un employé (nom, poste)…';
  @Output() employeSelectionne = new EventEmitter<DossierEmploye>();

  recherche = new FormControl<string>('', { nonNullable: true });
  employeCourant: DossierEmploye | null = null;
  resultats: DossierEmploye[] = [];
  afficherDropdown = false;
  chargement = false;

  private destroy$ = new Subject<void>();
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};
  private disabled = false;

  constructor(
    private service: DossierEmployeService,
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

  writeValue(employeId: string | null): void {
    if (!employeId) {
      this.employeCourant = null;
      this.recherche.setValue('', { emitEvent: false });
      this.cdr.markForCheck();
      return;
    }
    this.service.getEmployeById(employeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: e => {
        this.employeCourant = e;
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
    this.service.getEmployes(0, 20, { q })
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

  selectionner(e: DossierEmploye): void {
    this.employeCourant = e;
    this.recherche.setValue(this.libelleCourant(), { emitEvent: false });
    this.resultats = [];
    this.afficherDropdown = false;
    this.onChange(e.id ?? null);
    this.employeSelectionne.emit(e);
    this.cdr.markForCheck();
  }

  effacer(): void {
    if (this.disabled) return;
    this.employeCourant = null;
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

  nomComplet(e: DossierEmploye): string {
    return `${e.prenom} ${e.nom}`.trim();
  }

  private libelleCourant(): string {
    if (!this.employeCourant) return '';
    return this.nomComplet(this.employeCourant);
  }

  trackById(_: number, e: DossierEmploye): string {
    return e.id ?? e.matricule;
  }
}
