import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Observable, map } from 'rxjs';

import { AddWineFormComponent } from '../components/add-wine-form/add-wine-form.component';
import { CellarCellComponent } from '../components/cellar-cell/cellar-cell.component';
import { CustomModalComponent } from '../components/custom-modal/custom-modal.component';
import { SearchBarComponent, SearchableItem } from '../components/search-bar/search-bar.component';
import { WineSheetModalComponent } from '../components/wine-sheet-modal/wine-sheet-modal.component';
import { createWineForm, emptyWineFormValue, wineDetailsFromForm } from '../core/forms/wine-form';
import { CaveSlot, CellPlacement, UserWine } from '../core/models/wine.model';
import { AuthService } from '../core/services/auth.service';
import { CaveService } from '../core/services/cave.service';
import { ToastService } from '../core/services/toast.service';
import { WINE_TYPE_CONFIG, WineType } from '../core/types/WineType';
import { errorCodeOf } from '../core/utils/error.util';
import { findFreePlacements, formatPlacement } from '../core/utils/placement.util';
import { searchItems } from '../core/utils/search.util';

/** Clés de traduction des erreurs d'ajout, selon le code d'erreur Firestore. */
const ADD_WINE_ERROR_KEYS: Readonly<Record<string, string>> = {
  'permission-denied': 'CAVE.ADD_WINE.ERRORS.PERMISSION_DENIED',
  unavailable: 'CAVE.ADD_WINE.ERRORS.UNAVAILABLE',
  'invalid-argument': 'CAVE.ADD_WINE.ERRORS.INVALID_DATA',
};

@Component({
  selector: 'app-cave',
  standalone: true,
  templateUrl: './cave.page.html',
  styleUrls: ['./cave.page.scss'],
  imports: [
    CommonModule,
    IonicModule,
    CellarCellComponent,
    WineSheetModalComponent,
    SearchBarComponent,
    TranslocoPipe,
    ReactiveFormsModule,
    CustomModalComponent,
    AddWineFormComponent,
  ],
})
export class CavePage implements OnInit {
  readonly caveService = inject(CaveService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  /** Grille de la cave, regroupée par rangée. */
  gridRows$!: Observable<CaveSlot[][]>;

  isSheetOpen = false;
  isAddWineSheetOpen = false;
  isSubmittingWine = false;
  wine: UserWine | null = null;
  coords: CellPlacement | null = null;
  newWineCoords: CellPlacement | null = null;

  searchableItems: SearchableItem[] = [];
  matchedIds = new Set<string>();
  searchActive = false;
  private searchQuery = '';

  readonly wineForm = createWineForm(this.fb);

  ngOnInit(): void {
    this.gridRows$ = this.caveService.grid$.pipe(map((slots) => this.groupSlotsByRow(slots)));

    this.caveService.wines$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((wines) => {
        this.searchableItems = this.toSearchableItems(wines);
        this.refreshSearch();
      });

    this.wineForm.controls.vintage.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.wineForm.controls.peakMaturityYear.updateValueAndValidity({ emitEvent: false }));
  }

  get occupiedCount(): number {
    return this.caveService.occupiedCount;
  }

  get totalCapacity(): number {
    return this.caveService.totalCapacity;
  }

  get user() {
    return this.auth.currentUser;
  }

  get caveConfig() {
    return this.caveService.caveConfig;
  }

  get maxNewWineQuantity(): number {
    return Math.max(1, this.totalCapacity - this.occupiedCount);
  }

  // ── Recherche ─────────────────────────────────────────────

  onSearchQuery(query: string): void {
    this.searchQuery = query;
    this.refreshSearch();
  }

  private refreshSearch(): void {
    this.searchActive = this.searchQuery.trim().length > 0;
    this.matchedIds = new Set(searchItems(this.searchableItems, this.searchQuery).map((item) => item.id));
  }

  /** Une case est affichée si aucune recherche n'est active, ou si son vin correspond. */
  isSlotVisible(slot: CaveSlot): boolean {
    return !this.searchActive || (!!slot.wine?.id && this.matchedIds.has(slot.wine.id));
  }

  // ── Grille ────────────────────────────────────────────────

  onCellTap(slot: CaveSlot): void {
    if (slot.wine) {
      this.wine = slot.wine;
      this.coords = { row: slot.row, col: slot.col };
      this.isSheetOpen = true;
    } else {
      this.openAddWineSheet(slot.row, slot.col);
    }
  }

  formatCoords(slot: CaveSlot): string {
    return formatPlacement(slot);
  }

  // ── Ajout d'un vin ────────────────────────────────────────

  openAddWineSheet(row: number, col: number): void {
    const defaultFoodPairing = this.getDefaultFoodPairing(WineType.RED);

    this.newWineCoords = { row, col };
    this.wineForm.reset(emptyWineFormValue(defaultFoodPairing));
    this.wineForm.controls.quantity.setValidators(this.quantityValidators());
    this.wineForm.controls.quantity.updateValueAndValidity();
    this.isAddWineSheetOpen = true;
  }

  closeAddWineSheet(): void {
    this.isAddWineSheetOpen = false;
    this.newWineCoords = null;
  }

  async submitNewWine(): Promise<void> {
    const ownerId = this.user?.id;
    if (this.isSubmittingWine) return;
    if (this.wineForm.invalid || !this.newWineCoords || !ownerId) {
      this.wineForm.markAllAsTouched();
      return;
    }

    const value = this.wineForm.getRawValue();
    const quantity = Number(value.quantity);
    const { rows, cols } = this.caveService.caveConfig;
    const placements = findFreePlacements(rows, cols, this.caveService.cave, this.newWineCoords, quantity);

    if (placements.length !== quantity) {
      void this.toastService.error(this.transloco.translate('CAVE.ADD_WINE.NOT_ENOUGH_SLOTS'));
      return;
    }

    this.isSubmittingWine = true;
    try {
      await this.caveService.addWine({
        ownerId,
        isCustom: true,
        ...wineDetailsFromForm(value),
        placements,
      });
      void this.toastService.success(this.transloco.translate('CAVE.ADD_WINE.SUCCESS'));
      this.closeAddWineSheet();
    } catch (error) {
      console.error("Erreur lors de l'ajout du vin :", error);
      void this.toastService.error(this.transloco.translate(this.addWineErrorKey(error)));
    } finally {
      this.isSubmittingWine = false;
    }
  }

  // ── Internes ──────────────────────────────────────────────

  private toSearchableItems(wines: readonly UserWine[]): SearchableItem[] {
    return wines.map((wine) => ({
      id: wine.id ?? '',
      label: wine.name,
      subtitle: `${wine.domain} · ${wine.vintage}`,
      tag: wine.placements.map((placement) => formatPlacement(placement)).join(', '),
      keywords: [wine.name, wine.domain, wine.region, wine.appellation, wine.grapeVariety],
      placementCount: wine.placements.length || 1,
    }));
  }

  private groupSlotsByRow(slots: CaveSlot[]): CaveSlot[][] {
    return slots.reduce<CaveSlot[][]>((rows, slot) => {
      (rows[slot.row] ??= []).push(slot);
      return rows;
    }, []);
  }

  private quantityValidators() {
    return [Validators.required, Validators.min(1), Validators.max(this.maxNewWineQuantity)];
  }

  private getDefaultFoodPairing(type: WineType): string {
    return WINE_TYPE_CONFIG[type].defaultFoodPairing.map((key) => this.transloco.translate(key)).join(', ');
  }

  private addWineErrorKey(error: unknown): string {
    const code = errorCodeOf(error);
    return (code && ADD_WINE_ERROR_KEYS[code]) || 'CAVE.ADD_WINE.ERRORS.DEFAULT';
  }
}
