import { Component, inject } from '@angular/core';

import { registerIcons } from './core/icons';
import { MaturityNotificationService } from './core/services/maturity-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor() {
    registerIcons();
    inject(MaturityNotificationService).start();
  }
}
