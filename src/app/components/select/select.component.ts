import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
})
export class SelectComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() placeholder = '';
  @Input() options: SelectOption[] = [];
  @Output() valueChange = new EventEmitter<string>();

  select(value: string | null | undefined): void {
    if (value !== undefined && value !== null) {
      this.valueChange.emit(value);
    }
  }

}
