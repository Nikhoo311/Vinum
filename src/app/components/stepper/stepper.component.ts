import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';

/** Sélecteur numérique « − 3 + » lié à un contrôle de formulaire. */
@Component({
  selector: 'app-stepper',
  standalone: true,
  templateUrl: './stepper.component.html',
  styleUrls: ['./stepper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, TranslocoModule],
})
export class StepperComponent implements OnInit {
  @Input({ required: true }) control!: AbstractControl | null;
  @Input({ required: true }) label!: string;
  @Input() min = 1;
  @Input() max = 999;
  @Input() step = 1;

  value = 0;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.value = this.control?.value ?? this.min;

    this.control?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.value = value ?? this.min;
      this.cdr.markForCheck();
    });
  }

  decrement(): void {
    this.setValue(this.value - this.step);
  }

  increment(): void {
    this.setValue(this.value + this.step);
  }

  private setValue(next: number): void {
    if (next < this.min || next > this.max) return;

    this.control?.setValue(next);
    this.control?.markAsDirty();
  }
}
