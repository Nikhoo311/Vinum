import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';

import { InputComponent } from '../components/input/input.component';
import { StepperComponent } from '../components/stepper/stepper.component';
import { RadioGroupComponent } from "../components/wines-radio-group/wines-radio-group.component";

import { CAVE_MAX, WineType } from '../core/types/WineType';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-preference',
  standalone: true,
  templateUrl: './preference.page.html',
  styleUrls: ['./preference.page.scss'],
  imports: [CommonModule, IonicModule, TranslocoModule, ReactiveFormsModule, InputComponent, StepperComponent, RadioGroupComponent],
})
export class PreferencePage {
  readonly CAVE_MAX = CAVE_MAX;
  currentStep = 0;

  identityForm: FormGroup;
  wineForm: FormGroup;
  caveForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.identityForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(1)]],
      lastName: ['', [Validators.required, Validators.minLength(1)]],
    });

    this.wineForm = this.fb.group({
      selectedType: [null as WineType | null, Validators.required],
    });

    this.caveForm = this.fb.group({
      rows: [5, [Validators.required, Validators.min(1)]],
      cols: [3, [Validators.required, Validators.min(1)]],
    });
  }

  get rows() { return this.caveForm.value.rows ?? 1; }
  get cols() { return this.caveForm.value.cols ?? 1; }
  get rowsMax() { return Math.floor(this.CAVE_MAX / Math.max(this.cols, 1)); }
  get colsMax() { return Math.floor(this.CAVE_MAX / Math.max(this.rows, 1)); }

  goToStep(step: number): void { this.currentStep = step; }

  async finishOnboarding(): Promise<void> {
    if (this.identityForm.invalid || this.wineForm.invalid || this.caveForm.invalid) return;

    const currentUser = this.authService.currentUser;
    if (!currentUser) return;

    const updatedUser = {
      ...currentUser,
      ...this.identityForm.value,
      favoriteWineType: this.wineForm.get("selectedType")?.value,
      caveConfig: {
        rows: this.rows,
        cols: this.cols,
        viewMode: 'grid' as const,
      }
    };

    try {
      await this.authService.saveUserPreferences(updatedUser as any);
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde :', error);
    }
  }
}
