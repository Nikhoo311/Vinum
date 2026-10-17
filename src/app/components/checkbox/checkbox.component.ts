import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

/** Case à cocher dont toute la ligne (libellé compris) est cliquable. */
@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss'],
})
export class CheckboxComponent {
  @Input() checked = false;
  @Input() label = '';
  @Input() description = '';
  @Input() disabled = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  toggle(checked: boolean): void {
    this.checkedChange.emit(checked);
  }
}
