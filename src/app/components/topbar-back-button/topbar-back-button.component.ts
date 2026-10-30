import { Location } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-topbar-back-button',
  standalone: true,
  templateUrl: './topbar-back-button.component.html',
  styleUrls: ['./topbar-back-button.component.scss'],
  imports: [IonicModule],
})
export class TopbarBackButtonComponent {
  private readonly location = inject(Location);

  @Input({ required: true }) label = '';

  goBack(): void {
    this.location.back();
  }
}
