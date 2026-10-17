import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { CustomModalComponent } from '../../components/custom-modal/custom-modal.component';
import { InputComponent } from '../../components/input/input.component';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { WINE_TYPE_CONFIG, WineTypeConfig } from '../../core/types/WineType';
import { errorCodeOf, toErrorKey } from '../../core/utils/error.util';
import { ERRORS_CODES } from '../../core/types/ErrorsCode';

@Component({
  selector: 'app-personal-information',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, IonicModule, TranslocoModule, InputComponent, CustomModalComponent],
  templateUrl: './personal-information.page.html',
  styleUrls: ['./personal-information.page.scss'],
})
export class PersonalInformationPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly form = new FormGroup({
    firstName: new FormControl({ value: this.user?.firstName ?? '', disabled: true }, { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl({ value: this.user?.lastName ?? '', disabled: true }, { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl({ value: this.user?.email ?? '', disabled: true }, { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  readonly passwordForm = new FormGroup({
    oldPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  isPasswordModalOpen = false;
  emailChanged = false;
  saving = false;

  get user(): User | null {
    return this.auth.currentUser;
  }

  get isGoogleUser(): boolean {
    return this.user?.provider === 'google';
  }

  get fullName(): string {
    return `${this.user?.firstName ?? ''} ${this.user?.lastName ?? ''}`.trim();
  }

  get initials(): string {
    const first = this.user?.firstName?.[0] ?? '';
    const last = this.user?.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || '?';
  }

  get favoriteWineConfig(): WineTypeConfig | null {
    const type = this.user?.favoriteWineType;
    return type ? (WINE_TYPE_CONFIG[type] ?? null) : null;
  }

  goBack(): void {
    this.location.back();
  }

  goToFavoriteWine(): void {
    void this.router.navigate(['/settings/favorite-wine']);
  }

  async save(): Promise<void> {
    if (this.saving) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { firstName, lastName, email } = this.form.getRawValue();
    const data = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() };

    if (data.email !== this.user?.email && !this.isGoogleUser) {
      await this.promptPasswordThenSave(data);
      return;
    }

    await this.persistPersonalInfo(data);
  }

  private async promptPasswordThenSave(data: { firstName: string; lastName: string; email: string }): Promise<void> {
    const t = (key: string) => this.transloco.translate(`SETTINGS.ACCOUNT_PAGE.EMAIL_CHANGE_CONFIRM.${key}`);
    const alert = await this.alertCtrl.create({
      header: t('HEADER'),
      message: t('MESSAGE'),
      inputs: [{ name: 'password', type: 'password', placeholder: t('PASSWORD_PLACEHOLDER') }],
      buttons: [
        { text: t('CANCEL'), role: 'cancel' },
        {
          text: t('CONFIRM'),
          handler: (value: { password?: string }) => {
            void this.persistPersonalInfo(data, value?.password);
          },
        },
      ],
      mode: 'ios',
    });
    await alert.present();
  }

  private async persistPersonalInfo(data: { firstName: string; lastName: string; email: string }, password?: string): Promise<void> {
    const emailChanged = data.email !== this.user?.email;

    this.saving = true;
    try {
      await this.auth.updatePersonalInfo(data, password);

      if (emailChanged) {
        this.emailChanged = true;
        void this.toastService.info(this.transloco.translate('SETTINGS.INFO_PERSONAL.EMAIL_CONFIRMATION_SENT'));
      } else {
        void this.toastService.success(this.transloco.translate('SETTINGS.INFO_PERSONAL.UPDATE_SUCCESS'));
        this.goBack();
      }
    } catch (error) {
      void this.toastService.error(
        this.transloco.translate('SETTINGS.INFO_PERSONAL.UPDATE_ERROR', { error: this.transloco.translate(toErrorKey(error)) }),
      );
    } finally {
      this.saving = false;
    }
  }

  openPasswordModal(): void {
    if (this.isGoogleUser) return;
    this.passwordForm.reset();
    this.isPasswordModalOpen = true;
  }

  closePasswordModal(): void {
    this.isPasswordModalOpen = false;
  }

  async submitPasswordChange(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { oldPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      void this.toastService.warning(this.transloco.translate('SETTINGS.CHANGE_PASSWORD.MISMATCH'));
      return;
    }

    try {
      await this.auth.updatePassword(oldPassword, newPassword);
      this.closePasswordModal();
      void this.toastService.success(this.transloco.translate('SETTINGS.CHANGE_PASSWORD.SUCCESS'));
    } catch (error) {
      void this.toastService.error(this.transloco.translate(toErrorKey(error, 'SETTINGS.CHANGE_PASSWORD.ERROR')));
    }
  }

  async logout(): Promise<void> {
    try {
      await this.auth.logout();
    } catch (error) {
      void this.toastService.error(this.transloco.translate(toErrorKey(error)));
    }
  }

  async confirmDeleteAccount(): Promise<void> {
    const t = (key: string) => this.transloco.translate(`SETTINGS.ACCOUNT_PAGE.DELETE_ACCOUNT.${key}`);
    const alert = await this.alertCtrl.create({
      cssClass: 'delete-alert',
      header: t('CONFIRM_HEADER'),
      message: t('CONFIRM_MESSAGE'),
      inputs: this.isGoogleUser ? [] : [{ name: 'password', type: 'password', placeholder: t('PASSWORD_PLACEHOLDER') }],
      buttons: [
        { text: t('CANCEL'), role: 'cancel' },
        {
          text: t('CONFIRM'),
          role: 'destructive',
          handler: (value: { password?: string }) => {
            void this.deleteAccount(value?.password);
          },
        },
      ],
      mode: 'ios',
    });
    await alert.present();
  }

  private async deleteAccount(password?: string): Promise<void> {
    try {
      await this.auth.deleteAccount(password);
      await this.router.navigateByUrl('/auth');
    } catch (error) {
      const key = errorCodeOf(error) === ERRORS_CODES.auth.requiresRecentLogin
        ? 'AUTH.REQUIRES_RECENT_LOGIN'
        : 'SETTINGS.ACCOUNT_PAGE.DELETE_ACCOUNT.ERROR';
      void this.toastService.error(this.transloco.translate(key));
    }
  }
}
