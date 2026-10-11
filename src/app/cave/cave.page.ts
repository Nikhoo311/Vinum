import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, map, Subscription } from 'rxjs';
import { CaveService, CaveSlot } from '../core/services/cave.service';
import { CellarCellComponent } from '../components/cellar-cell/cellar-cell.component';
import { UserWine } from '../core/models/wine.model';
import { AuthService } from '../core/services/auth.service';
import { WineSheetModalComponent } from '../components/wine-sheet-modal/wine-sheet-modal.component';
import { WINE_TYPE_CONFIG, WineType } from '../core/types/WineType';
import { SearchBarComponent, SearchableItem } from '../components/search-bar/search-bar.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { InputComponent } from '../components/input/input.component';
import { RadioGroupComponent } from '../components/wines-radio-group/wines-radio-group.component';
import { CustomModalComponent } from '../components/custom-modal/custom-modal.component';
import { ToastService } from '../core/services/toast.service';
import { StepperComponent } from '../components/stepper/stepper.component';
import { TextAreaInputComponent } from '../components/text-area-input/text-area-input.component';

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
    InputComponent,
    RadioGroupComponent,
    CustomModalComponent,
    StepperComponent,
    TextAreaInputComponent,
  ],
})
export class CavePage implements OnInit, OnDestroy {
  grid$!: Observable<CaveSlot[]>;
  gridRows$!: Observable<CaveSlot[][]>;
  isSheetOpen = false;
  isAddWineSheetOpen = false;
  isSubmittingWine = false;
  wine: UserWine | null = null;
  coords: { row: number; col: number } | null = null;
  newWineCoords: { row: number; col: number } | null = null;
  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;
  searchableItems: SearchableItem[] = [];
  matchedIds = new Set<string>();
  private caveSubscription?: Subscription;
  private wineTypeSubscription?: Subscription;

  readonly wineForm = this.fb.group({
    type: [WineType.RED, Validators.required],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    domain: ['', [Validators.required, Validators.maxLength(100)]],
    vintage: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(new Date().getFullYear())]],
    region: ['', [Validators.required, Validators.maxLength(100)]],
    grapeVariety: ['', [Validators.required, Validators.maxLength(100)]],
    unitPrice: [null as number | null, [Validators.required, Validators.min(0)]],
    rating: [null as number | null, [Validators.min(0), Validators.max(5)]],
    description: ['', Validators.maxLength(1000)],
    foodPairing: ['', Validators.maxLength(500)],
    quantity: [1, [Validators.required, Validators.min(1)]],
  });

  constructor(
    public caveService: CaveService,
    private auth: AuthService,
    private fb: FormBuilder,
    private toastService: ToastService,
    private transloco: TranslocoService,
  ) {}

  ngOnInit() {
    this.grid$ = this.caveService.grid$;
    this.gridRows$ = this.caveService.grid$.pipe(map((slots) => this.groupSlotsByRow(slots)));
    this.updateSearchableItems();
    this.caveSubscription = this.caveService.grid$.subscribe(() => {
      this.updateSearchableItems();
    });
    this.wineTypeSubscription = this.wineForm.controls.type.valueChanges.subscribe((type) => {
      if (type) {
        this.setDefaultFoodPairing(type as WineType);
      }
    });
  }

  ngOnDestroy() {
    this.caveSubscription?.unsubscribe();
    this.wineTypeSubscription?.unsubscribe();
  }

  updateSearchableItems() {
    const wines = this.caveService.cave;
    this.searchableItems = wines.map(wine => ({
      id: wine.id || '',
      label: wine.name,
      subtitle: `${wine.domain} · ${wine.vintage}`,
      tag: wine.placements?.map(p => this.caveService.formatPlacementCoords(p)).join(', '),
      keywords: [wine.name, wine.domain, wine.region, wine.appellation, wine.grapeVariety],
      placementCount: wine.placements?.length || 1
    }));
  }

  onSearchMatch(matchedIds: Set<string>) {
    this.matchedIds = matchedIds;
  }

  get occupiedCount() {
    return this.caveService.occupiedCount;
  }

  get totalCapacity() {
    return this.caveService.totalCapacity;
  }

  get user() {
    return this.auth.currentUser;
  }

  get caveConfig() {
    return this.caveService.caveConfig;
  }

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
    return this.caveService.formatPlacementCoords({ row: slot.row, col: slot.col })
  }

  private groupSlotsByRow(slots: CaveSlot[]): CaveSlot[][] {
    return slots.reduce<CaveSlot[][]>((rows, slot) => {
      (rows[slot.row] ??= []).push(slot);
      return rows;
    }, []);
  }

  get maxNewWineQuantity(): number {
    return Math.max(1, this.caveService.totalCapacity - this.caveService.occupiedCount);
  }

  get remainingSlotsAfterQuantity(): number {
    const quantity = Number(this.wineForm.controls.quantity.value) || 1;
    return Math.max(0, this.maxNewWineQuantity - quantity);
  }

  get previewWineType(): WineType {
    return this.wineForm.controls.type.value as WineType;
  }

  get previewWineName(): string {
    return this.wineForm.controls.name.value?.trim() || 'Nom du vin';
  }

  get previewWineVintage(): number | string {
    return this.wineForm.controls.vintage.value || '—';
  }

  get previewWineDomain(): string {
    return this.wineForm.controls.domain.value?.trim() || 'Domaine';
  }

  openAddWineSheet(row: number, col: number): void {
    this.newWineCoords = { row, col };
    this.wineForm.reset({
      type: WineType.RED,
      name: '',
      domain: '',
      vintage: new Date().getFullYear(),
      region: '',
      grapeVariety: '',
      unitPrice: null,
      rating: null,
      description: '',
      foodPairing: this.getDefaultFoodPairing(WineType.RED),
      quantity: 1,
    });
    this.wineForm.controls.quantity.setValidators([Validators.required, Validators.min(1), Validators.max(this.maxNewWineQuantity)]);
    this.wineForm.controls.quantity.updateValueAndValidity();
    this.isAddWineSheetOpen = true;
  }

  closeAddWineSheet(): void {
    this.isAddWineSheetOpen = false;
    this.newWineCoords = null;
  }

  async submitNewWine(): Promise<void> {
    if (this.wineForm.invalid || !this.newWineCoords || !this.user?.id) {
      this.wineForm.markAllAsTouched();
      return;
    }

    const value = this.wineForm.getRawValue();
    const placements = this.getAvailablePlacements(Number(value.quantity));
    if (placements.length !== Number(value.quantity)) {
      this.toastService.error('Le nombre d’emplacements disponibles est insuffisant.');
      return;
    }
    this.isSubmittingWine = true;

    try {
      const wineToAdd: Omit<UserWine, 'id'> = {
        ownerId: this.user.id,
        isCustom: true,
        name: value.name!.trim(),
        domain: value.domain!.trim(),
        region: value.region!.trim(),
        vintage: Number(value.vintage),
        type: value.type as WineType,
        grapeVariety: value.grapeVariety!.trim(),
        unitPrice: Number(value.unitPrice),
        description: value.description?.trim() || '',
        foodPairing: (value.foodPairing ?? '')
          .split(',')
          .map((pairing) => pairing.trim())
          .filter(Boolean),
        placements,
      };

      if (value.rating !== null) {
        wineToAdd.rating = Number(value.rating);
      }

      await this.caveService.addWine(wineToAdd);
      this.updateSearchableItems();
      this.toastService.success('Vin ajouté à la cave.');
      this.closeAddWineSheet();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du vin :', error);
      this.toastService.error(this.getAddWineErrorMessage(error));
    } finally {
      this.isSubmittingWine = false;
    }
  }

  private getAvailablePlacements(quantity: number): { row: number; col: number }[] {
    if (!this.newWineCoords) return [];

    const { rows, cols } = this.caveService.caveConfig;
    const allSlots = Array.from({ length: rows * cols }, (_, index) => ({
      row: Math.floor(index / cols),
      col: index % cols,
    }));
    const startIndex = allSlots.findIndex((slot) =>
      slot.row === this.newWineCoords!.row && slot.col === this.newWineCoords!.col
    );
    const occupiedSlots = new Set(
      this.caveService.cave.flatMap((wine) => (wine.placements ?? []).map((placement) => `${placement.row}-${placement.col}`))
    );
    const orderedSlots = [...allSlots.slice(startIndex), ...allSlots.slice(0, startIndex)];

    return orderedSlots
      .filter((slot) => !occupiedSlots.has(`${slot.row}-${slot.col}`))
      .slice(0, quantity);
  }

  private setDefaultFoodPairing(type: WineType): void {
    this.wineForm.controls.foodPairing.setValue(this.getDefaultFoodPairing(type));
  }

  private getDefaultFoodPairing(type: WineType): string {
    return WINE_TYPE_CONFIG[type].defaultFoodPairing
      .map((key) => this.transloco.translate(key))
      .join(', ');
  }

  private getAddWineErrorMessage(error: unknown): string {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: string }).code
      : undefined;

    if (code === 'permission-denied') {
      return this.transloco.translate('CAVE.ADD_WINE.ERRORS.PERMISSION_DENIED');
    }

    if (code === 'unavailable') {
      return this.transloco.translate('CAVE.ADD_WINE.ERRORS.UNAVAILABLE');
    }

    if (code === 'invalid-argument') {
      return this.transloco.translate('CAVE.ADD_WINE.ERRORS.INVALID_DATA');
    }

    return this.transloco.translate('CAVE.ADD_WINE.ERRORS.DEFAULT');
  }

}
