import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';

import { WINE_TYPE_CONFIG, WineType } from '../../core/types/WineType';
import { InputComponent } from '../input/input.component';
import { StepperComponent } from '../stepper/stepper.component';
import { TextAreaInputComponent } from '../text-area-input/text-area-input.component';
import { WinesRadioGroupComponent } from '../wines-radio-group/wines-radio-group.component';

/**
 * Formulaire d'un vin, partagé par l'ajout et la modification.
 * Le groupe de contrôles est fourni par le parent (voir `createWineForm`).
 */
@Component({
  selector: 'app-add-wine-form',
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule, TranslocoModule, InputComponent, WinesRadioGroupComponent, StepperComponent, TextAreaInputComponent],
  templateUrl: './add-wine-form.component.html',
  styleUrls: ['./add-wine-form.component.scss'],
})
export class AddWineFormComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() formId = 'add-wine-form';
  @Input() maxQuantity = 1;
  @Input() showQuantity = true;
  @Output() formSubmit = new EventEmitter<void>();

  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;

  get type(): WineType {
    return (this.form.controls['type'].value as WineType) || WineType.RED;
  }

  /** Nom saisi (vide tant que rien n'est saisi : le gabarit affiche alors un libellé par défaut). */
  get previewName(): string {
    return this.form.controls['name'].value?.trim() ?? '';
  }

  get previewVintage(): number | string {
    return this.form.controls['vintage'].value || '—';
  }

  get previewDomain(): string {
    return this.form.controls['domain'].value?.trim() ?? '';
  }

  get quantity(): number {
    return Number(this.form.controls['quantity'].value) || 1;
  }

  get remainingSlots(): number {
    return Math.max(0, this.maxQuantity - this.quantity);
  }
}
