import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { WINE_TYPES, WINE_TYPE_CONFIG, WineType, isWineType } from '../../core/types/WineType';
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
export class AddWineFormComponent implements OnInit {
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) form!: FormGroup;
  @Input() formId = 'add-wine-form';
  @Input() maxQuantity = 1;
  @Input() showQuantity = true;
  @Output() formSubmit = new EventEmitter<void>();

  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;

  ngOnInit(): void {
    // Choisir un type propose les accords mets-vins correspondants (voir applyDefaultFoodPairing).
    this.form.controls['type'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => this.applyDefaultFoodPairing(type));
  }

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

  /**
   * Remplace les accords par ceux du nouveau type, sauf si l'utilisateur les a saisis lui-même :
   * on ne remplace que ce qui est vide ou égal aux accords proposés pour un type.
   */
  private applyDefaultFoodPairing(type: unknown): void {
    const control = this.form.controls['foodPairing'];
    if (!control || !isWineType(type)) return;

    const current = String(control.value ?? '').trim();
    const isUntouched = current === '' || WINE_TYPES.some((known) => this.defaultFoodPairing(known) === current);
    if (isUntouched) control.setValue(this.defaultFoodPairing(type));
  }

  private defaultFoodPairing(type: WineType): string {
    return WINE_TYPE_CONFIG[type].defaultFoodPairing.map((key) => this.transloco.translate(key)).join(', ');
  }
}
