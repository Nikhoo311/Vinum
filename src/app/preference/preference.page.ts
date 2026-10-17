import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { InputComponent } from '../components/input/input.component';
import { StepperComponent } from '../components/stepper/stepper.component';
import { WinesRadioGroupComponent } from '../components/wines-radio-group/wines-radio-group.component';
import { User } from '../core/models/user.model';
import { AuthService } from '../core/services/auth.service';
import { ToastService } from '../core/services/toast.service';
import { CAVE_MAX, WineType } from '../core/types/WineType';
import { toErrorKey } from '../core/utils/error.util';

/** Refuse une saisie composée uniquement d'espaces (traitée comme un champ vide). */
function notBlank(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;
}

/** Onboarding en 4 étapes : identité, vin préféré, taille de la cave, confirmation. */
@Component({
  selector: 'app-preference',
  standalone: true,
  templateUrl: './preference.page.html',
  styleUrls: ['./preference.page.scss'],
  imports: [CommonModule, IonicModule, TranslocoModule, ReactiveFormsModule, InputComponent, StepperComponent, WinesRadioGroupComponent],
})
export class PreferencePage {
  readonly CAVE_MAX = CAVE_MAX;

  currentStep = 0;
  saving = false;

  readonly identityForm = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, notBlank] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, notBlank] }),
  });

  readonly wineForm = new FormGroup({
    selectedType: new FormControl<WineType | null>(null, Validators.required),
  });

  readonly caveForm = new FormGroup({
    rows: new FormControl(5, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    cols: new FormControl(3, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
  });

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  get rows(): number {
    return this.caveForm.controls.rows.value;
  }

  get cols(): number {
    return this.caveForm.controls.cols.value;
  }

  get rowsMax(): number {
    return Math.floor(CAVE_MAX / Math.max(this.cols, 1));
  }

  get colsMax(): number {
    return Math.floor(CAVE_MAX / Math.max(this.rows, 1));
  }

  goToStep(step: number): void {
    this.currentStep = step;
  }

  async finishOnboarding(): Promise<void> {
    if (this.saving) return;
    if (this.identityForm.invalid || this.wineForm.invalid || this.caveForm.invalid) return;

    const currentUser = this.authService.currentUser;
    if (!currentUser) return;

    const { firstName, lastName } = this.identityForm.getRawValue();
    const updatedUser: User = {
      ...currentUser,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      favoriteWineType: this.wineForm.controls.selectedType.value,
      caveConfig: { rows: this.rows, cols: this.cols, viewMode: 'grid' },
    };

    this.saving = true;
    try {
      await this.authService.saveUserPreferences(updatedUser);
      await this.router.navigateByUrl('/home');
    } catch (error) {
      void this.toastService.error(this.transloco.translate(toErrorKey(error, 'PREFERENCES.SAVE_ERROR')));
    } finally {
      this.saving = false;
    }
  }
}
