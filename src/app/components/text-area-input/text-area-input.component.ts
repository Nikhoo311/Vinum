import { Component, Input } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FormErrorComponent } from '../form-error/form-error.component';

@Component({
  selector: 'app-text-area-input',
  standalone: true,
  imports: [ReactiveFormsModule, IonicModule, FormErrorComponent],
  templateUrl: './text-area-input.component.html',
  styleUrls: ['./text-area-input.component.scss'],
})
export class TextAreaInputComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) control!: AbstractControl | null;
  @Input() placeholder = '';
  @Input() autoGrow = true;
  @Input() showRequirement = false;
  @Input() required = false;
}
