import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { IonicModule, SegmentCustomEvent } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { UtilsComponent } from '../components/utils/utils.component';
import { AuthService } from '../core/services/auth.service';
import { ToastService } from '../core/services/toast.service';
import { AuthTypeEnum } from '../core/types/AuthTypeEnum';
import { isUserCancellation, toErrorKey } from '../core/utils/error.util';

@Component({
  selector: 'app-auth',
  standalone: true,
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  imports: [CommonModule, IonicModule, TranslocoModule, UtilsComponent],
})
export class AuthPage {
  protected readonly AuthTypeEnum = AuthTypeEnum;

  mode: AuthTypeEnum = AuthTypeEnum.LOGIN;
  loading = false;

  private readonly transloco = inject(TranslocoService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);

  onModeChange(event: SegmentCustomEvent): void {
    const value = event.detail.value;
    if (value === AuthTypeEnum.LOGIN || value === AuthTypeEnum.REGISTER) {
      this.mode = value;
    }
  }

  async loginWithGoogle(): Promise<void> {
    if (this.loading) return;

    this.loading = true;
    try {
      await this.authService.loginWithGoogle();
    } catch (error) {
      if (!isUserCancellation(error)) {
        void this.toastService.error(this.transloco.translate(toErrorKey(error, 'AUTH.GOOGLE_ERROR')));
      }
    } finally {
      this.loading = false;
    }
  }
}
