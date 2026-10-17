import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';

import { WINE_TYPE_CONFIG, WineType } from '../../core/types/WineType';

export interface RadioOption {
  value: string;
  label: string;
  icon?: string;
  backgroundColor?: string;
}

/** Sélecteur du type de vin (rouge, blanc, rosé, champagne), lié à un contrôle de formulaire. */
@Component({
  selector: 'app-wines-radio-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, TranslocoModule],
  templateUrl: './wines-radio-group.component.html',
  styleUrls: ['./wines-radio-group.component.scss'],
})
export class WinesRadioGroupComponent implements OnInit {
  @Input({ required: true }) control!: AbstractControl | null;
  /** Valeur présélectionnée si le contrôle est encore vide. */
  @Input() defaultValue: WineType | null | undefined = null;
  /** Affichage en ligne (formulaire d'ajout) plutôt qu'en liste. */
  @Input() row = false;

  readonly options: RadioOption[] = Object.entries(WINE_TYPE_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
    icon: config.icon,
    backgroundColor: `color-mix(in srgb, var(--wine-${value}) 60%, transparent)`,
  }));

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
