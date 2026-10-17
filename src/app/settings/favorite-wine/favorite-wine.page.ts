import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { WinesRadioGroupComponent } from '../../components/wines-radio-group/wines-radio-group.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { WineType } from '../../core/types/WineType';
import { toErrorKey } from '../../core/utils/error.util';

@Component({
  selector: 'app-favorite-wine',
  standalone: true,
  templateUrl: './favorite-wine.page.html',
  styleUrls: ['./favorite-wine.page.scss'],
  imports: [CommonModule, IonicModule, TranslocoModule, ReactiveFormsModule, WinesRadioGroupComponent],
})
export class FavoriteWinePage {
  private readonly location = inject(Location);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly wineForm = new FormGroup({
    selectedType: new FormControl<WineType | null>(null, Validators.required),
  });

  loading = false;

  /** Valeur actuelle du profil (source de vérité, indépendante de l'historique de navigation). */
  get favoriteWine(): WineType | null {
    return this.authService.currentUser?.favoriteWineType ?? null;
  }

  async updateFavoriteWine(): Promise<void> {
    const selectedType = this.wineForm.controls.selectedType.value;
    if (this.loading || this.wineForm.invalid || !selectedType) return;

    this.loading = true;
    try {
      await this.authService.updateFavoriteWine(selectedType);
      void this.toastService.success(this.transloco.translate('SETTINGS.FAVORITE_WINE.UPDATE_SUCCESS'));
      this.goBack();
    } catch (error) {
      void this.toastService.error(
        this.transloco.translate('SETTINGS.FAVORITE_WINE.UPDATE_ERROR', { error: this.transloco.translate(toErrorKey(error)) }),
      );
    } finally {
      this.loading = false;
    }
  }

  goBack(): void {
    this.location.back();
  }
}
