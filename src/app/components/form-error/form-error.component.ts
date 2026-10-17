import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';

/** Clé de traduction (et paramètres éventuels) associés à chaque type d'erreur de validation. */
interface ErrorMessage {
  key: string;
  params?: Record<string, unknown>;
}

/** Affiche le premier message d'erreur d'un contrôle de formulaire, une fois touché ou modifié. */
@Component({
  selector: 'app-form-error',
  templateUrl: './form-error.component.html',
  styleUrls: ['./form-error.component.scss'],
  imports: [CommonModule, IonicModule],
})
export class FormErrorComponent {
  @Input() control!: AbstractControl | null;

  private readonly transloco = inject(TranslocoService);

  get errorMessage(): string | null {
    const control = this.control;
    if (!control?.errors || (!control.touched && !control.dirty)) return null;

    const [errorKey, errorValue] = Object.entries(control.errors)[0] as [string, Record<string, number> | true];
    const detail = typeof errorValue === 'object' ? errorValue : {};
    const message = this.messageFor(errorKey, detail);

    return this.transloco.translate(message.key, message.params);
  }

  private messageFor(errorKey: string, detail: Record<string, number>): ErrorMessage {
    switch (errorKey) {
      case 'required':
        return { key: 'AUTH.RULES.REQUIRED' };
      case 'email':
        return { key: 'AUTH.RULES.EMAIL' };
      case 'minlength':
        return { key: 'AUTH.RULES.PASSWORD' };
      case 'passwordMismatch':
        return { key: 'AUTH.RULES.SAME_PASSWORD' };
      case 'emailAlreadyTaken':
        return { key: 'AUTH.RULES.EMAIL_ALREADY_TAKEN' };
      case 'min':
        return { key: 'FORM_ERRORS.MIN', params: { min: detail['min'] } };
      case 'max':
        return { key: 'FORM_ERRORS.MAX', params: { max: detail['max'] } };
      case 'maxlength':
        return { key: 'FORM_ERRORS.MAX_LENGTH', params: { max: detail['requiredLength'] } };
      case 'pattern':
        return { key: 'FORM_ERRORS.YEAR' };
      case 'peakMaturityYearBeforeVintage':
        return { key: 'FORM_ERRORS.PEAK_MATURITY_YEAR' };
      case 'halfStepRating':
        return { key: 'FORM_ERRORS.HALF_STEP' };
      default:
        return { key: 'FORM_ERRORS.INVALID' };
    }
  }
}
