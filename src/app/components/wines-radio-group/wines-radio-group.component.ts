import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';
import { WINE_TYPE_CONFIG, WineType } from 'src/app/core/types/WineType';

export interface RadioOption {
  value: string;
  label: string;
  icon?: string;
  backgroundColor?: string;
}

@Component({
  selector: 'app-wines-radio-group',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    TranslocoModule,
  ],
  templateUrl: './wines-radio-group.component.html',
  styleUrls: ['./wines-radio-group.component.scss']
})
export class RadioGroupComponent implements OnInit {

  @Input({ required: true }) control!: AbstractControl | null;
  @Input() defaultValue!: WineType | null;
  @Input() row = false;

  readonly options: RadioOption[] = Object.entries(WINE_TYPE_CONFIG).map(
    ([value, config]) => ({
      value,
      label: config.label,
      icon: config.icon,
      backgroundColor: `color-mix(in srgb, var(--wine-${value}) 60%, transparent)`
    })
  );

  constructor() {}

  ngOnInit(): void {
    if (this.defaultValue && !this.control?.value) {
      this.control?.setValue(this.defaultValue);
    }
  }

  select(value: string): void {
    this.control?.setValue(value);
    this.control?.markAsTouched();
  }

  isSelected(value: string): boolean {
    return this.control?.value === value;
  }
}
