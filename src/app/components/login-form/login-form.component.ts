import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { toErrorKey } from '../../core/utils/error.util';
import { InputComponent } from '../input/input.component';

@Component({
  selector: 'app-login-form',
  standalone: true,
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, IonicModule, TranslocoModule, InputComponent],
})
export class LoginFormComponent {
  readonly loginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
  });

  loading = false;

  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  async login(): Promise<void> {
    if (this.loading) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      void this.toastService.warning(this.transloco.translate('AUTH.RULES.FILL_ALL_FIELDS'));
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.getRawValue();

    try {
      await this.authService.login(email.trim(), password);
    } catch (error) {
      void this.toastService.error(this.transloco.translate(toErrorKey(error)));
    } finally {
      this.loading = false;
    }
  }

  async forgotPassword(): Promise<void> {
    const email = this.loginForm.controls.email.value.trim();

    if (!email || this.loginForm.controls.email.hasError('email')) {
      void this.toastService.error(this.transloco.translate('AUTH.FORGOT_PASSWORD_EMAIL_REQUIRED'));
      return;
    }

    try {
      await this.authService.sendPasswordResetEmail(email);
      void this.toastService.success(this.transloco.translate('AUTH.FORGOT_PASSWORD_SUCCESS'));
    } catch {
      void this.toastService.error(this.transloco.translate('AUTH.FORGOT_PASSWORD_ERROR'));
    }
  }
}
