import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Observable, map } from 'rxjs';

import { CustomModalComponent } from '../components/custom-modal/custom-modal.component';
import { StepperComponent } from '../components/stepper/stepper.component';
import { CaveView } from '../core/models/user.model';
import { AuthService } from '../core/services/auth.service';
import { CaveService } from '../core/services/cave.service';
import { MaturityNotificationService } from '../core/services/maturity-notification.service';
import { DarkModeSetting, PreferencesService } from '../core/services/preferences.service';
import { StarWineService } from '../core/services/star-wine.service';
import { ToastService } from '../core/services/toast.service';
import { LANGUAGE_CONFIG } from '../core/types/LanguageConfig';
import { CAVE_MAX, WINE_TYPE_CONFIG } from '../core/types/WineType';
import { toErrorKey } from '../core/utils/error.util';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  imports: [CommonModule, IonicModule, TranslocoModule, ReactiveFormsModule, CustomModalComponent, StepperComponent],
})
export class SettingsPage {
  private readonly authService = inject(AuthService);
  private readonly starWine = inject(StarWineService);

  readonly maxEmplacements = CAVE_MAX;
  readonly features = environment.features;

  readonly isDarkMode$: Observable<boolean>;
  readonly notificationsEnabled$: Observable<boolean>;

  selectedView: CaveView = this.authService.currentUser?.caveConfig?.viewMode ?? 'grid';
  isDispositionModalOpen = false;
  isViewChangePending = false;
  isSavingDisposition = false;

  readonly dispositionForm = new FormGroup({
    rows: new FormControl(this.authService.currentUser?.caveConfig?.rows || 5, { nonNullable: true }),
    cols: new FormControl(this.authService.currentUser?.caveConfig?.cols || 3, { nonNullable: true }),
  });

  private readonly router = inject(Router);
  private readonly caveService = inject(CaveService);
  private readonly prefs = inject(PreferencesService);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly alertController = inject(AlertController);
  private readonly maturityNotifications = inject(MaturityNotificationService);

  constructor() {
    this.isDarkMode$ = this.prefs.preferences$.pipe(map((p) => p.darkMode === 'dark'));
    this.notificationsEnabled$ = this.prefs.preferences$.pipe(map((p) => p.notificationsEnabled));
  }

  get user() {
    return this.authService.currentUser;
  }

  get caveConfig() {
    return this.user?.caveConfig;
  }

  get maxSlots(): number {
    return (this.caveConfig?.cols ?? 0) * (this.caveConfig?.rows ?? 0);
  }

  get favoriteWineLabelKey(): string {
    const type = this.user?.favoriteWineType;
    return type ? (WINE_TYPE_CONFIG[type]?.label ?? '') : '';
  }

  /** Nom natif de la langue active ; retombe sur le code si la langue est inconnue. */
  get selectedLanguage(): string {
    const code = this.prefs.current.language;
    return LANGUAGE_CONFIG[code]?.nativeName ?? code;
  }

  get isDarkMode(): boolean {
    return this.prefs.current.darkMode === 'dark';
  }

  get maxRows(): number {
    return Math.floor(this.maxEmplacements / (this.dispositionForm.controls.cols.value || 1));
  }

  get maxCols(): number {
    return Math.floor(this.maxEmplacements / (this.dispositionForm.controls.rows.value || 1));
  }

  get dispositionTotal(): number {
    return (this.dispositionForm.controls.rows.value || 0) * (this.dispositionForm.controls.cols.value || 0);
  }

  openDispositionSheet(): void {
    this.dispositionForm.setValue(
      { rows: this.caveConfig?.rows || 5, cols: this.caveConfig?.cols || 3 },
      { emitEvent: false },
    );
    this.isDispositionModalOpen = true;
  }

  closeDispositionModal(): void {
    this.isDispositionModalOpen = false;
  }

  /**
   * Enregistre la nouvelle disposition. Si des bouteilles sortent de la grille,
   * l'utilisateur doit confirmer leur retrait avant toute modification.
   */
  async saveDisposition(): Promise<void> {
    if (this.isSavingDisposition) return;

    const { rows, cols } = this.dispositionForm.getRawValue();
    if (rows === this.caveConfig?.rows && cols === this.caveConfig?.cols) {
      this.closeDispositionModal();
      return;
    }

    const plan = this.caveService.previewResize(rows, cols);
    if (plan.removedBottles > 0 && !(await this.confirmResize(plan.removedBottles, plan.deletions.length))) {
      return;
    }

    this.isSavingDisposition = true;
    try {
      await this.caveService.resizeCave(rows, cols);
      void this.toastService.success(this.transloco.translate('SETTINGS.CAVE.DISPOSITION.MODAL.SAVE_SUCCESS'));
      this.closeDispositionModal();
    } catch (error) {
      void this.toastService.error(
        this.transloco.translate('SETTINGS.CAVE.DISPOSITION.MODAL.SAVE_ERROR', {
          error: this.transloco.translate(toErrorKey(error)),
        }),
      );
    } finally {
      this.isSavingDisposition = false;
    }
  }

  async onViewChange(event: CustomEvent): Promise<void> {
    if (this.isViewChangePending) return;

    const previousView = this.selectedView;
    const newView = event.detail.value as CaveView;
    if (newView !== 'grid' && newView !== 'list') return;
    if (newView === previousView) return;

    this.selectedView = newView;
    this.isViewChangePending = true;

    try {
      await this.authService.updateCaveConfig({ viewMode: newView });
      void this.toastService.success(
        this.transloco.translate('SETTINGS.CAVE.DISPLAY.UPDATE_SUCCESS', {
          view: this.transloco.translate(`SETTINGS.CAVE.DISPLAY.${newView.toUpperCase()}`),
        }),
      );
    } catch {
      this.selectedView = previousView;
      void this.toastService.error(this.transloco.translate('SETTINGS.CAVE.DISPLAY.UPDATE_ERROR'));
    } finally {
      this.isViewChangePending = false;
    }
  }

  async onNotificationsToggle(event: CustomEvent): Promise<void> {
    const enabled = event.detail.checked as boolean;
    if (enabled === this.prefs.current.notificationsEnabled) return;

    if (enabled && !(await this.maturityNotifications.requestPermission())) {
      if (event.target) (event.target as unknown as { checked: boolean }).checked = false;
      await this.prefs.setNotificationsEnabled(false);
      void this.toastService.warning(this.transloco.translate('SETTINGS.CAVE.NOTIFICATIONS.PERMISSION_DENIED'));
      return;
    }
    await this.prefs.setNotificationsEnabled(enabled);
  }

  async onDarkModeToggle(event: CustomEvent): Promise<void> {
    const value: DarkModeSetting = (event.detail.checked as boolean) ? 'dark' : 'light';
    await this.prefs.setDarkMode(value);
  }

  goToInfoPerso(): void {
    void this.router.navigate(['/settings/personal-information']);
  }

  goToVinPrefere(): void {
    void this.router.navigate(['/settings/favorite-wine']);
  }

  goToStarWine(): void {
    void this.router.navigate(['/settings/star-wine']);
  }

  /** Nom du critère de vin star actuellement choisi. */
  get starWineCriterionLabel(): string {
    return this.starWine.criterionLabel(this.starWine.criterion);
  }

  /** Pastille « Nouveau » tant que l'écran n'a pas été ouvert. */
  get isStarWineNew(): boolean {
    return this.starWine.isNew;
  }

  goToLanguage(): void {
    void this.router.navigate(['/settings/language']);
  }

  private async confirmResize(bottles: number, wines: number): Promise<boolean> {
    const alert = await this.alertController.create({
      header: this.transloco.translate('SETTINGS.CAVE.DISPOSITION.CONFIRM.TITLE'),
      message: this.transloco.translate('SETTINGS.CAVE.DISPOSITION.CONFIRM.MESSAGE', { count: bottles, wines }),
      buttons: [
        { text: this.transloco.translate('COMMON.CANCEL'), role: 'cancel' },
        { text: this.transloco.translate('SETTINGS.CAVE.DISPOSITION.CONFIRM.CONFIRM'), role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }
}
