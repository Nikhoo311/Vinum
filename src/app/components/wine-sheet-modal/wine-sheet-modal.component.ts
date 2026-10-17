import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { UserWine } from '../../core/models/wine.model';
import { WINE_TYPE_CONFIG } from '../../core/types/WineType';
import { CaveService } from 'src/app/core/services/cave.service';
import { CustomModalComponent } from '../custom-modal/custom-modal.component';
import { ToastService } from 'src/app/core/services/toast.service';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AddWineFormComponent } from '../add-wine-form/add-wine-form.component';

function peakMaturityYearAfterVintage(control: AbstractControl): ValidationErrors | null {
  const peakMaturityYear = control.value;
  const vintage = control.parent?.get('vintage')?.value;

  if (peakMaturityYear === null || peakMaturityYear === '' || vintage === null || vintage === '') {
    return null;
  }

  return Number(peakMaturityYear) > Number(vintage) ? null : { peakMaturityYearBeforeVintage: true };
}

function halfStepRating(control: AbstractControl): ValidationErrors | null {
  const rating = control.value;

  if (rating === null || rating === '') return null;

  return Number(rating) * 2 % 1 === 0 ? null : { halfStepRating: true };
}

@Component({
  selector: 'app-wine-sheet-modal',
  templateUrl: './wine-sheet-modal.component.html',
  styleUrls: ['./wine-sheet-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslocoModule, ReactiveFormsModule, CustomModalComponent, AddWineFormComponent]
})
export class WineSheetModalComponent {
  @Input({ required: true }) canRemoveBottle: boolean = false;
  @Input({ required: true }) wine: UserWine | null = null;
  @Input() isOpen = false;
  @Input() coords: { row: number; col: number } | null = null;
  @Input() catalogueMode = false;
  @Input() isWishlisted = false;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() wishlistToggle = new EventEmitter<void>();
  @Output() addToCave = new EventEmitter<void>();

  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;
  readonly ratingValues = [1, 2, 3, 4, 5];
  isRatingModalOpen = false;
  selectedRating: number | null = null;
  isSavingRating = false;
  isEditWineModalOpen = false;
  isSavingWine = false;
  private pendingBottleRemoval: { row: number; col: number } | null = null;

  constructor(
    private caveService: CaveService,
    private toastService: ToastService,
    private transloco: TranslocoService,
    private fb: FormBuilder
  ) {}

  readonly editWineForm = this.fb.group({
    type: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    domain: ['', [Validators.required, Validators.maxLength(100)]],
    vintage: [null as number | null, Validators.required],
    peakMaturityYear: [null as number | null, [Validators.pattern(/^\d{4}$/), peakMaturityYearAfterVintage]],
    region: ['', [Validators.required, Validators.maxLength(100)]],
    grapeVariety: ['', [Validators.required, Validators.maxLength(100)]],
    unitPrice: [null as number | null, [Validators.required, Validators.min(0)]],
    rating: [null as number | null, [Validators.min(0), Validators.max(5), halfStepRating]],
    description: ['', Validators.maxLength(1000)],
    foodPairing: ['', Validators.maxLength(500)],
    quantity: [1],
  });

  get formattedPlacements(): string[] {
    if (!this.wine?.placements) return [];
    return this.wine.placements.map(placement => this.caveService.formatPlacementCoords(placement)).sort();
  }

  closeModal() {
    this.isOpen = false;
    this.isOpenChange.emit(false);
  }

  get canSaveRating(): boolean {
    return this.selectedRating !== null || this.wine?.rating != null;
  }

  get isRemovingBottle(): boolean {
    return this.pendingBottleRemoval !== null;
  }

  openRatingModal(bottleToRemove: { row: number; col: number } | null = null): void {
    if (!this.wine || this.catalogueMode) return;

    this.selectedRating = this.wine.rating != null ? Math.round(this.wine.rating * 2) / 2 : null;
    this.pendingBottleRemoval = bottleToRemove;
    this.isRatingModalOpen = true;
  }

  closeRatingModal(): void {
    this.isRatingModalOpen = false;
    this.selectedRating = null;
    this.pendingBottleRemoval = null;
  }

  openEditWineModal(): void {
    if (!this.wine) return;
    this.editWineForm.reset({
      type: this.wine.type,
      name: this.wine.name,
      domain: this.wine.domain,
      vintage: this.wine.vintage,
      peakMaturityYear: this.wine.peakMaturityYear ?? null,
      region: this.wine.region,
      grapeVariety: this.wine.grapeVariety ?? '',
      unitPrice: this.wine.unitPrice,
      rating: this.wine.rating ?? null,
      description: this.wine.description ?? '',
      foodPairing: this.wine.foodPairing?.join(', ') ?? '',
      quantity: this.wine.placements.length,
    });
    this.closeModal();
    this.isEditWineModalOpen = true;
  }

  closeEditWineModal(): void {
    this.isEditWineModalOpen = false;
  }

  async saveWineEdition(): Promise<void> {
    if (!this.wine?.id || this.editWineForm.invalid || this.isSavingWine) {
      this.editWineForm.markAllAsTouched();
      return;
    }

    this.isSavingWine = true;

    try {
      const value = this.editWineForm.getRawValue();
      const updatedWine: UserWine = {
        ...this.wine,
        type: value.type as UserWine['type'],
        name: value.name!.trim(),
        domain: value.domain!.trim(),
        region: value.region!.trim(),
        vintage: Number(value.vintage),
        grapeVariety: value.grapeVariety!.trim(),
        unitPrice: Number(value.unitPrice),
        description: value.description?.trim() ?? '',
        foodPairing: (value.foodPairing ?? '')
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
      };

      if (value.rating !== null) {
        updatedWine.rating = Number(value.rating);
      } else {
        delete updatedWine.rating;
      }

      if (value.peakMaturityYear !== null) {
        updatedWine.peakMaturityYear = Number(value.peakMaturityYear);
      } else {
        delete updatedWine.peakMaturityYear;
      }

      await this.caveService.updateWine(updatedWine);
      this.wine = updatedWine;
      this.toastService.success(this.transloco.translate('WINE_SHEET_MODAL.EDIT_MODAL.SUCCESS', {
        name: updatedWine.name,
      }));
      this.closeEditWineModal();
    } catch {
      this.toastService.error(this.transloco.translate('WINE_SHEET_MODAL.EDIT_MODAL.ERROR'));
    } finally {
      this.isSavingWine = false;
    }
  }

  selectRating(star: number, event: MouseEvent): void {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const rating = event.detail === 0 || event.clientX - bounds.left > bounds.width / 2
      ? star
      : star - 0.5;

    this.selectedRating = this.selectedRating === rating ? null : rating;
  }

  getRatingIcon(star: number): 'star' | 'star-half' | 'star-outline' {
    if (this.selectedRating === null || this.selectedRating < star - 0.5) return 'star-outline';
    if (this.selectedRating === star - 0.5) return 'star-half';
    return 'star';
  }

  get ratingLabelKey(): string {
    return `WINE_SHEET_MODAL.RATING_MODAL.LABEL_${this.selectedRating?.toString().replace('.', '_')}`;
  }

  async saveRating(): Promise<void> {
    if (!this.wine?.id || !this.canSaveRating || this.isSavingRating) return;

    this.isSavingRating = true;
    try {
      const wineId = this.wine.id;
      const rating = this.selectedRating;
      const bottleToRemove = this.pendingBottleRemoval;

      await this.caveService.updateWineRating(wineId, rating);
      this.wine = { ...this.wine, rating: rating ?? undefined };
      if (bottleToRemove) {
        await this.caveService.removeBottle(wineId, bottleToRemove);
      }

      this.toastService.success(this.transloco.translate(
        rating === null
          ? 'WINE_SHEET_MODAL.RATING_MODAL.REMOVED'
          : 'WINE_SHEET_MODAL.RATING_MODAL.SAVED',
        { rating }
      ));
      this.closeRatingModal();
      if (bottleToRemove) this.closeModal();
    } catch {
      this.toastService.error(this.transloco.translate('WINE_SHEET_MODAL.RATING_MODAL.SAVE_ERROR'));
    } finally {
      this.isSavingRating = false;
    }
  }

  async skipRating(): Promise<void> {
    if (!this.wine?.id || !this.pendingBottleRemoval || this.isSavingRating) return;

    this.isSavingRating = true;
    try {
      await this.caveService.removeBottle(this.wine.id, this.pendingBottleRemoval);
      this.closeRatingModal();
      this.closeModal();
    } catch {
      this.toastService.error(this.transloco.translate('WINE_SHEET_MODAL.RATING_MODAL.REMOVE_ERROR'));
    } finally {
      this.isSavingRating = false;
    }
  }

  async removeBottle(cords: { row: number; col: number }) {
    if (!this.wine || !this.wine.id) return;

    if (this.wine.rating == null) {
      this.openRatingModal(cords);
      return;
    }

    await this.caveService.removeBottle(this.wine.id, cords);

    this.closeModal();
  }
}
