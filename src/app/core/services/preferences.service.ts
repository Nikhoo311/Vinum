import { inject, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { StarWineCriterion } from '../utils/star-wine.util';
import {
  AppPreferences,
  DEFAULT_PREFERENCES,
  DarkModeSetting,
  RawPreferences,
  sanitizePreferences,
} from '../utils/preferences.util';

export type { AppPreferences, DarkModeSetting } from '../utils/preferences.util';

const KEYS = {
  darkMode: 'darkMode',
  language: 'language',
  notificationsEnabled: 'notificationsEnabled',
  starWineCriterion: 'starWineCriterion',
} as const;

/**
 * Préférences de l'appareil (thème, langue, notifications), stockées localement avec
 * Capacitor Preferences. Initialisées au démarrage par un `APP_INITIALIZER` afin que
 * l'interface s'affiche directement dans la bonne langue et le bon thème.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly transloco = inject(TranslocoService);

  private readonly preferencesSubject = new BehaviorSubject<AppPreferences>({ ...DEFAULT_PREFERENCES });
  readonly preferences$ = this.preferencesSubject.asObservable();

  private systemDarkMediaQuery?: MediaQueryList;
  private initialized = false;

  get current(): AppPreferences {
    return this.preferencesSubject.value;
  }

  /** Langues réellement disponibles (déclarées dans la configuration Transloco). */
  get availableLangs(): string[] {
    const langs = this.transloco.getAvailableLangs() as (string | { id: string })[];
    return langs.map((lang) => (typeof lang === 'string' ? lang : lang.id));
  }

  async init(): Promise<AppPreferences> {
    if (this.initialized) return this.current;
    this.initialized = true;

    let preferences: AppPreferences = { ...DEFAULT_PREFERENCES };
    try {
      const [darkMode, language, notificationsEnabled, starWineCriterion] = await Promise.all([
        Preferences.get({ key: KEYS.darkMode }),
        Preferences.get({ key: KEYS.language }),
        Preferences.get({ key: KEYS.notificationsEnabled }),
        Preferences.get({ key: KEYS.starWineCriterion }),
      ]);
      const raw: RawPreferences = {
        darkMode: darkMode.value,
        language: language.value,
        notificationsEnabled: notificationsEnabled.value,
        starWineCriterion: starWineCriterion.value,
      };
      preferences = sanitizePreferences(raw, this.availableLangs);
    } catch (error) {
      console.warn('Lecture des préférences impossible, valeurs par défaut utilisées.', error);
    }

    this.preferencesSubject.next(preferences);
    await this.applyLanguage(preferences.language);
    this.watchSystemTheme();
    this.applyDarkMode(preferences.darkMode);

    return preferences;
  }

  async setDarkMode(value: DarkModeSetting): Promise<void> {
    await Preferences.set({ key: KEYS.darkMode, value });
    this.preferencesSubject.next({ ...this.current, darkMode: value });
    this.applyDarkMode(value);
  }

  async setLanguage(value: string): Promise<void> {
    if (!this.availableLangs.includes(value)) return;

    await Preferences.set({ key: KEYS.language, value });
    this.preferencesSubject.next({ ...this.current, language: value });
    await this.applyLanguage(value);
  }

  async setNotificationsEnabled(value: boolean): Promise<void> {
    await Preferences.set({ key: KEYS.notificationsEnabled, value: String(value) });
    this.preferencesSubject.next({ ...this.current, notificationsEnabled: value });
  }

  async setStarWineCriterion(value: StarWineCriterion): Promise<void> {
    await Preferences.set({ key: KEYS.starWineCriterion, value });
    this.preferencesSubject.next({ ...this.current, starWineCriterion: value });
  }

  // ── Internes ──────────────────────────────────────────────

  /** Charge la langue avant de l'activer pour éviter d'afficher les clés brutes. */
  private async applyLanguage(language: string): Promise<void> {
    try {
      await firstValueFrom(this.transloco.load(language));
      this.transloco.setActiveLang(language);
      document.documentElement.lang = language;
    } catch (error) {
      console.error(`Traductions "${language}" indisponibles.`, error);
      if (language !== DEFAULT_PREFERENCES.language) {
        await this.applyLanguage(DEFAULT_PREFERENCES.language);
      }
    }
  }

  private watchSystemTheme(): void {
    if (typeof window.matchMedia !== 'function') return;

    this.systemDarkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemDarkMediaQuery.addEventListener('change', () => {
      if (this.current.darkMode === 'system') this.applyDarkMode('system');
    });
  }

  private applyDarkMode(value: DarkModeSetting): void {
    const isDark = value === 'dark' || (value === 'system' && !!this.systemDarkMediaQuery?.matches);

    document.body.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    this.syncStatusBar(isDark);
  }

  /** Aligne la couleur des icônes de la barre d'état Android sur le thème. */
  private syncStatusBar(isDark: boolean): void {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => undefined);
  }
}
