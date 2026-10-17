import { inject, Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { closeOutline } from 'ionicons/icons';

import { DEFAULT_TOAST_DURATION, TOAST_CONFIG, ToastType } from '../types/ToastType';

const INFO_TOAST_DURATION = 4000;

/** Affiche des notifications éphémères (toasts) ; une nouvelle notification remplace la précédente. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastCtrl = inject(ToastController);
  private current?: HTMLIonToastElement;

  success(message: string): Promise<void> {
    return this.show('success', message);
  }

  error(message: string): Promise<void> {
    return this.show('error', message);
  }

  warning(message: string): Promise<void> {
    return this.show('warning', message);
  }

  info(message: string): Promise<void> {
    return this.show('info', message, INFO_TOAST_DURATION);
  }

  private async show(type: ToastType, message: string, duration: number = DEFAULT_TOAST_DURATION): Promise<void> {
    const { color, icon } = TOAST_CONFIG[type];

    await this.current?.dismiss().catch(() => false);
    this.current = await this.toastCtrl.create({
      message,
      duration,
      color,
      icon,
      position: 'bottom',
      buttons: [{ icon: closeOutline, role: 'cancel' }],
    });
    await this.current.present();
  }
}
