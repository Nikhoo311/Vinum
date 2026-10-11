import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';
import { FormErrorComponent } from '../form-error/form-error.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, TranslocoModule, FormErrorComponent],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent implements OnInit {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) control!: AbstractControl | null;

  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' = 'text';
  @Input() placeholder = '';
  @Input() iconName = '';
  @Input() showIcon = false;
  @Input() showEye = false;
  @Input() canEdit = false;
  @Input() grouped = true;
  @Input() showRequirement = false;
  @Input() required = false;

  passwordVisible: boolean = false;
  isEditing: boolean = false;

  ngOnInit(): void {
    if (this.canEdit && this.control) {
      this.control.disable();
    }
  }

  get inputType(): string {
    if (this.showEye && this.type === 'password') {
      return this.passwordVisible ? 'text' : 'password';
    }
    return this.type;
  }
  
  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleEdit(): void {
    if (!this.control) return;

    this.isEditing = !this.isEditing;

    if (this.isEditing) {
      this.control.enable();
    } else {
      this.control.disable();
    }
  }
}
