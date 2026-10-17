import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { createWineForm, wineDetailsFromForm, wineFormValueFrom } from '../../core/forms/wine-form';
import { CellPlacement, UserWine } from '../../core/models/wine.model';
import { CaveService } from '../../core/services/cave.service';
import { ToastService } from '../../core/services/toast.service';
import { WINE_TYPE_CONFIG } from '../../core/types/WineType';
import { comparePlacements, formatPlacement } from '../../core/utils/placement.util';
import { ratingKeySuffix } from '../../core/utils/wine.util';
import { AddWineFormComponent } from '../add-wine-form/add-wine-form.component';
import { CustomModalComponent } from '../custom-modal/custom-modal.component';

/** Fiche détaillée d'un vin, avec modification, notation et retrait d'une bouteille. */
@Component({
  selector: 'app-wine-sheet-modal',
  templateUrl: './wine-sheet-modal.component.html',
  styleUrls: ['./wine-sheet-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslocoModule, ReactiveFormsModule, CustomModalComponent, AddWineFormComponent],
})
export class WineSheetModalComponent {
  @Input({ required: true }) canRemoveBottle = false;
  @Input({ required: true }) wine: UserWine | null = null;
  @Input() isOpen = false;
  @Input() coords: CellPlacement | null = null;
  @Output() isOpenChange = new EventEmitter<boolean>();

  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;
  readonly ratingValues = [1, 2, 3, 4, 5];

  isRatingModalOpen = false;
  selectedRating: number | null = null;
  isSavingRating = false;
  isEditWineModalOpen = false;
  isSavingWine = false;

  private readonly caveService = inject(CaveService);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly fb = inject(FormBuilder);

  readonly editWineForm = createWineForm(this.fb);

  /** Bouteille en cours de retrait pendant que la fenêtre de notation est ouverte. */
  private pendingBottleRemoval: CellPlacement | null = null;

  get formattedPlacements(): string[] {
    return [...(this.wine?.placements ?? [])].sort(comparePlacements).map((placement) => formatPlacement(placement));
  }

  get canSaveRating(): boolean {
    return this.selectedRating !== null || this.wine?.rating != null;
  }

  get isRemovingBottle(): boolean {
    return this.pendingBottleRemoval !== null;
  }

  get ratingLabelKey(): string {
    return `WINE_SHEET_MODAL.RATING_MODAL.LABEL_${ratingKeySuffix(this.selectedRating ?? 0)}`;
  }

  closeModal(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
  }

  // ── Modification ──────────────────────────────────────────

  openEditWineModal(): void {
    if (!this.wine) return;

    this.editWineForm.reset(wineFormValueFrom(this.wine));
    this.closeModal();
    this.isEditWineModalOpen = true;
  }

  closeEditWineModal(): void {
    this.isEditWineModalOpen = false;
  }

  async saveWineEdition(): Promise<void> {
    if (!this.wine?.id || this.isSavingWine) return;
    if (this.editWineForm.invalid) {
      this.editWineForm.markAllAsTouched();
      return;
    }

    this.isSavingWine = true;
    try {
      const details = wineDetailsFromForm(this.editWineForm.getRawValue());
      const updatedWine: UserWine = { ...this.wine, ...details };

      // Une note ou une année d'apogée effacée doit disparaître de la fiche.
      if (details.rating === undefined) delete updatedWine.rating;
      if (details.peakMaturityYear === undefined) delete updatedWine.peakMaturityYear;

      await this.caveService.updateWine(updatedWine);
      this.wine = updatedWine;
      void this.toastService.success(
        this.transloco.translate('WINE_SHEET_MODAL.EDIT_MODAL.SUCCESS', { name: updatedWine.name })
      );
      this.closeEditWineModal();
    } catch (error) {
      console.error('Modification du vin impossible :', error);
      void this.toastService.error(this.transloco.translate('WINE_SHEET_MODAL.EDIT_MODAL.ERROR'));
    } finally {
      this.isSavingWine = false;
    }
  }

  // ── Notation ──────────────────────────────────────────────

  openRatingModal(bottleToRemove: CellPlacement | null = null): void {
    if (!this.wine) return;

    this.selectedRating = this.wine.rating != null ? Math.round(this.wine.rating * 2) / 2 : null;
    this.pendingBottleRemoval = bottleToRemove;
    this.isRatingModalOpen = true;
  }

  closeRatingModal(): void {
    this.isRatingModalOpen = false;
    this.selectedRating = null;
    this.pendingBottleRemoval = null;
  }

  /** Un clic sur la moitié gauche d'une étoile donne une demi-note ; recliquer retire la note. */
  selectRating(star: number, event: MouseEvent): void {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const rating = event.detail === 0 || event.clientX - bounds.left > bounds.width / 2 ? star : star - 0.5;

    this.selectedRating = this.selectedRating === rating ? null : rating;
  }

  getRatingIcon(star: number): 'star' | 'star-half' | 'star-outline' {
    if (this.selectedRating === null || this.selectedRating < star - 0.5) return 'star-outline';
    if (this.selectedRating === star - 0.5) return 'star-half';
    return 'star';
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

      void this.toastService.success(
        this.transloco.translate(
          rating === null ? 'WINE_SHEET_MODAL.RATING_MODAL.REMOVED' : 'WINE_SHEET_MODAL.RATING_MODAL.SAVED',
          { rating }
        )
      );
      this.closeRatingModal();
      if (bottleToRemove) this.closeModal();
    } catch (error) {
      console.error("Enregistrement de la note impossible :", error);
      void this.toastService.error(this.transloco.translate('WINE_SHEET_MODAL.RATING_MODAL.SAVE_ERROR'));
    } finally {
      this.isSavingRating = false;
    }
  }

  /** Retire la bouteille sans la noter. */
  async skipRating(): Promise<void> {
    if (!this.wine?.id || !this.pendingBottleRemoval || this.isSavingRating) return;

    this.isSavingRating = true;
    try {
      await this.caveService.removeBottle(this.wine.id, this.pendingBottleRemoval);
      this.closeRatingModal();
      this.closeModal();
    } catch (error) {
      console.error('Retrait de la bouteille impossible :', error);
      void this.toastService.error(this.transloco.translate('WINE_SHEET_MODAL.RATING_MODAL.REMOVE_ERROR'));
    } finally {
      this.isSavingRating = false;
    }
  }

  // ── Retrait d'une bouteille ───────────────────────────────

  /** Retire la bouteille ; si le vin n'est pas encore noté, propose d'abord de le noter. */
  async removeBottle(placement: CellPlacement): Promise<void> {
    if (!this.wine?.id) return;

    if (this.wine.rating == null) {
      this.openRatingModal(placement);
      return;
    }

    try {
      await this.caveService.removeBottle(this.wine.id, placement);
      this.closeModal();
    } catch (error) {
      console.error('Retrait de la bouteille impossible :', error);
      void this.toastService.error(this.transloco.translate('WINE_SHEET_MODAL.RATING_MODAL.REMOVE_ERROR'));
    }
  }
}
