import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TranslocoService } from '@jsverse/transloco';
import { EMPTY, catchError, combineLatest, concatMap, debounceTime, distinctUntilChanged, from, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UserWine } from '../models/wine.model';
import { planMaturityNotifications } from '../utils/maturity.util';
import { CaveService } from './cave.service';
import { PreferencesService } from './preferences.service';

/**
 * Alertes de maturité : une notification locale par vin, le jour et le mois d'ajout, dans son année d'apogée
 * (ajouté le 03/10/2026, apogée 2028 → notification le 03/10/2028 à 10 h).
 *
 * Les notifications sont reprogrammées à chaque changement de la cave, de la langue ou du réglage,
 * ce qui garde l'agenda synchronisé (bouteille ajoutée, retirée, apogée modifiée, déconnexion…).
 * Réservé à l'application native ; sans effet dans le navigateur.
 */
@Injectable({ providedIn: 'root' })
export class MaturityNotificationService {
  private readonly caveService = inject(CaveService);
  private readonly prefs = inject(PreferencesService);
  private readonly transloco = inject(TranslocoService);

  private started = false;

  /** À appeler une fois au démarrage. */
  start(): void {
    if (this.started || !environment.features.maturityAlerts || !Capacitor.isNativePlatform()) return;
    this.started = true;

    combineLatest([
      this.caveService.wines$,
      this.prefs.preferences$.pipe(map((p) => p.notificationsEnabled), distinctUntilChanged()),
      this.prefs.preferences$.pipe(map((p) => p.language), distinctUntilChanged()),
    ])
      .pipe(
        debounceTime(500),
        concatMap(([wines, enabled]) =>
          from(this.sync(wines, enabled)).pipe(
            catchError((error) => {
              console.error('Programmation des alertes de maturité impossible.', error);
              return EMPTY;
            }),
          ),
        ),
      )
      .subscribe();
  }

  /** Demande l'autorisation d'afficher des notifications ; `true` si elle est accordée. */
  async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;

    try {
      const current = await LocalNotifications.checkPermissions();
      if (current.display === 'granted') return true;
      return (await LocalNotifications.requestPermissions()).display === 'granted';
    } catch {
      return false;
    }
  }

  private async sync(wines: readonly UserWine[], enabled: boolean): Promise<void> {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) });
    }

    if (!enabled) return;
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;

    const planned = planMaturityNotifications(wines, new Date());
    if (!planned.length) return;

    await LocalNotifications.schedule({
      notifications: planned.map((item) => ({
        id: item.id,
        title: this.transloco.translate('NOTIFICATIONS.MATURITY.TITLE'),
        body: this.transloco.translate('NOTIFICATIONS.MATURITY.BODY', {
          name: item.wineName,
          vintage: item.vintage,
          year: item.at.getFullYear(),
        }),
        schedule: { at: item.at, allowWhileIdle: true },
        extra: { wineId: item.wineId },
      })),
    });
  }
}
