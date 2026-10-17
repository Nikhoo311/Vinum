import { isDarkModeSetting, sanitizePreferences } from './preferences.util';

const LANGS = ['fr', 'en', 'es', 'it'];

describe('preferences.util', () => {
  it('reconnaît les modes d\'affichage valides', () => {
    expect(isDarkModeSetting('dark')).toBeTrue();
    expect(isDarkModeSetting('system')).toBeTrue();
    expect(isDarkModeSetting('blue')).toBeFalse();
    expect(isDarkModeSetting(null)).toBeFalse();
  });

  it('applique les valeurs par défaut quand rien n\'est stocké', () => {
    expect(sanitizePreferences({ darkMode: null, language: null, notificationsEnabled: null }, LANGS)).toEqual({
      darkMode: 'light',
      language: 'fr',
      notificationsEnabled: false,
      starWineCriterion: 'price',
    });
  });

  it('conserve des valeurs valides', () => {
    expect(
      sanitizePreferences({ darkMode: 'dark', language: 'it', notificationsEnabled: 'true' }, LANGS)
    ).toEqual({ darkMode: 'dark', language: 'it', notificationsEnabled: true, starWineCriterion: 'price' });

    expect(
      sanitizePreferences({ darkMode: null, language: null, notificationsEnabled: null, starWineCriterion: 'best-rated' }, LANGS).starWineCriterion
    ).toBe('best-rated');
  });

  it('écarte une langue indisponible ou un mode corrompu', () => {
    expect(
      sanitizePreferences({ darkMode: 'sepia', language: 'de', notificationsEnabled: 'oui' }, LANGS)
    ).toEqual({ darkMode: 'light', language: 'fr', notificationsEnabled: false, starWineCriterion: 'price' });

    expect(
      sanitizePreferences({ darkMode: null, language: null, notificationsEnabled: null, starWineCriterion: 'cheapest' }, LANGS).starWineCriterion
    ).toBe('price');
  });
});
