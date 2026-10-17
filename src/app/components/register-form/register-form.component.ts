import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ERRORS_CODES } from '../../core/types/ErrorsCode';
import { errorCodeOf, toErrorKey } from '../../core/utils/error.util';
import { InputComponent } from '../input/input.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register-form',
  standalone: true,
  templateUrl: './register-form.component.html',
  imports: [CommonModule, ReactiveFormsModule, IonicModule, TranslocoModule, InputComponent],
})
export class RegisterFormComponent {
  readonly registerForm = new FormGroup(
    {
      email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
      password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordsMatch },
  );

  loading = false;

  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  async register(): Promise<void> {
    if (this.loading) return;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      const key = this.registerForm.hasError('passwordMismatch') ? 'AUTH.RULES.SAME_PASSWORD' : 'AUTH.RULES.FILL_ALL_FIELDS';
      void this.toastService.warning(this.transloco.translate(key));
      return;
    }

    this.loading = true;
    const { email, password } = this.registerForm.getRawValue();

    try {
      await this.authService.register(email.trim(), password);
    } catch (error) {
      const message =
        errorCodeOf(error) === ERRORS_CODES.auth.emailAlreadyInUse
          ? this.transloco.translate('AUTH.RULES.EMAIL_ALREADY_TAKEN')
          : this.transloco.translate('AUTH.RULES.REGISTER_ERROR', { error: this.transloco.translate(toErrorKey(error)) });
      void this.toastService.error(message);
    } finally {
      this.loading = false;
    }
  }
}
