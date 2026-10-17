import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { IonModal, IonicModule } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';

/**
 * Feuille modale (bottom sheet) à points d'arrêt, avec pied de page fixe.
 * Le contenu est projeté tel quel ; le pied de page l'est via l'attribut `modal-footer`.
 */
@Component({
  selector: 'app-custom-modal',
  standalone: true,
  templateUrl: './custom-modal.component.html',
  styleUrls: ['./custom-modal.component.scss'],
  imports: [IonicModule, TranslocoModule],
})
export class CustomModalComponent {
  @ViewChild(IonModal) private modal?: IonModal;

  @Input() isOpen = false;
  @Input() initialBreakpoint = 0.95;
  @Input() breakpoints: number[] = [0, 0.5, 0.7, 0.95];
  @Input() background: string | null = null;
  @Input() footerHasBackground = true;
  @Input() showCloseButton = true;
  @Output() didDismiss = new EventEmitter<void>();

  get maxBreakpoint(): number {
    return this.breakpoints.length ? Math.max(...this.breakpoints) : 1;
  }

  get footerOffset(): string {
    return `${Math.max(0, 1 - this.maxBreakpoint) * 100}%`;
  }

  dismiss(): void {
    void this.modal?.dismiss();
  }

  handleDidDismiss(): void {
    this.isOpen = false;
    this.didDismiss.emit();
  }
}
