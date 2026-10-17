export type DarkModeSetting = 'light' | 'dark' | 'system';

export interface AppPreferences {
  darkMode: DarkModeSetting;
  language: string;
  notificationsEnabled: boolean;
}

export const DEFAULT_PREFERENCES: Readonly<AppPreferences> = Object.freeze({
  darkMode: 'light',
  language: 'fr',
  notificationsEnabled: false,
});

/** Valeurs brutes lues dans le stockage local (toujours des chaînes ou `null`). */
export interface RawPreferences {
  darkMode: string | null;
  language: string | null;
  notificationsEnabled: string | null;
}

export function isDarkModeSetting(value: unknown): value is DarkModeSetting {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Valide les préférences lues sur l'appareil : une valeur absente, corrompue ou
 * correspondant à une langue non disponible retombe sur la valeur par défaut.
 */
export function sanitizePreferences(
  raw: RawPreferences,
  availableLangs: readonly string[]
): AppPreferences {
  return {
    darkMode: isDarkModeSetting(raw.darkMode) ? raw.darkMode : DEFAULT_PREFERENCES.darkMode,
    language:
      raw.language !== null && availableLangs.includes(raw.language)
        ? raw.language
        : DEFAULT_PREFERENCES.language,
    notificationsEnabled:
      raw.notificationsEnabled === 'true'
        ? true
        : raw.notificationsEnabled === 'false'
          ? false
          : DEFAULT_PREFERENCES.notificationsEnabled,
  };
}
