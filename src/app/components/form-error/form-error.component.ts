import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'form-error',
  templateUrl: './form-error.component.html',
  styleUrls: ['./form-error.component.scss'],
  imports: [CommonModule, IonicModule]
})
export class FormErrorComponent  implements OnInit {
  @Input() control!: AbstractControl | null;

  constructor(private transloco: TranslocoService) { }
  
  ngOnInit() {}

  get errorMessage(): string | null {
    if (!this.control || !this.control.errors || (!this.control.touched && !this.control.dirty)) return null;

    const errorsMap: Record<string, string> = {
      required: this.transloco.translate('AUTH.RULES.REQUIRED'),
      email: this.transloco.translate('AUTH.RULES.EMAIL'),
      minlength: this.transloco.translate('AUTH.RULES.PASSWORD'),
      passwordMismatch: this.transloco.translate('AUTH.RULES.SAME_PASSWORD'),
      emailAlreadyTaken: this.transloco.translate('AUTH.RULES.EMAIL_ALREADY_TAKEN'),
    };

    const firstErrorKey = Object.keys(this.control.errors)[0];
    const error = this.control.errors[firstErrorKey] as { min?: number; max?: number; requiredLength?: number };

    if (firstErrorKey === 'min') {
      return this.transloco.translate('FORM_ERRORS.MIN', { min: error.min });
    }

    if (firstErrorKey === 'max') {
      return this.transloco.translate('FORM_ERRORS.MAX', { max: error.max });
    }

    if (firstErrorKey === 'maxlength') {
      return this.transloco.translate('FORM_ERRORS.MAX_LENGTH', { max: error.requiredLength });
    }

    if (firstErrorKey === 'pattern') {
      return this.transloco.translate('FORM_ERRORS.YEAR');
    }

    if (firstErrorKey === 'peakMaturityYearBeforeVintage') {
      return this.transloco.translate('FORM_ERRORS.PEAK_MATURITY_YEAR');
    }

    return errorsMap[firstErrorKey] || null;
  }
}
