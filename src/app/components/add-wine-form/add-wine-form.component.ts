import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';
import { InputComponent } from '../input/input.component';
import { RadioGroupComponent } from '../wines-radio-group/wines-radio-group.component';
import { StepperComponent } from '../stepper/stepper.component';
import { TextAreaInputComponent } from '../text-area-input/text-area-input.component';
import { WINE_TYPE_CONFIG, WineType } from '../../core/types/WineType';

@Component({
  selector: 'app-add-wine-form',
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule, TranslocoModule, InputComponent, RadioGroupComponent, StepperComponent, TextAreaInputComponent],
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

  get type(): WineType { return (this.form.controls['type'].value as WineType) || WineType.RED; }
  get previewName(): string { return this.form.controls['name'].value?.trim() || 'Nom du vin'; }
  get previewVintage(): number | string { return this.form.controls['vintage'].value || '—'; }
  get previewDomain(): string { return this.form.controls['domain'].value?.trim() || 'Domaine'; }
  get quantity(): number { return Number(this.form.controls['quantity'].value) || 1; }
  get remainingSlots(): number { return Math.max(0, this.maxQuantity - this.quantity); }

}
