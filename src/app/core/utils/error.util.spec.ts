import { AppError, errorCodeOf, isUserCancellation, toErrorKey } from './error.util';

describe('error.util', () => {
  describe('toErrorKey', () => {
    it('utilise la clé portée par une AppError', () => {
      expect(toErrorKey(new AppError('SETTINGS.CHANGE_PASSWORD.ERROR'))).toBe('SETTINGS.CHANGE_PASSWORD.ERROR');
    });

    it('traduit les codes Firebase connus', () => {
      expect(toErrorKey({ code: 'auth/invalid-credential' })).toBe('AUTH.INVALID_CREDENTIAL');
      expect(toErrorKey({ code: 'auth/wrong-password' })).toBe('AUTH.INVALID_CREDENTIAL');
      expect(toErrorKey({ code: 'auth/email-already-in-use' })).toBe('AUTH.RULES.EMAIL_ALREADY_TAKEN');
      expect(toErrorKey({ code: 'auth/too-many-requests' })).toBe('AUTH.TOO_MANY_ATTEMPTS');
      expect(toErrorKey({ code: 'unavailable' })).toBe('ERRORS.NETWORK');
      expect(toErrorKey({ code: 'permission-denied' })).toBe('ERRORS.PERMISSION_DENIED');
    });

    it('conserve un message déjà formaté comme une clé de traduction', () => {
      expect(toErrorKey(new Error('SETTINGS.INFO_PERSONAL.REQUIRED_PASSWORD_UPDATE_EMAIL_ERROR'))).toBe(
        'SETTINGS.INFO_PERSONAL.REQUIRED_PASSWORD_UPDATE_EMAIL_ERROR'
      );
    });

    it('retombe sur la clé générique, ou sur le repli fourni, pour tout le reste', () => {
      expect(toErrorKey(new Error('Something went wrong'))).toBe('ERRORS.GENERIC');
      expect(toErrorKey('texte')).toBe('ERRORS.GENERIC');
      expect(toErrorKey(undefined, 'AUTH.GOOGLE_ERROR')).toBe('AUTH.GOOGLE_ERROR');
      expect(toErrorKey({ code: 'auth/inconnu' }, 'AUTH.GOOGLE_ERROR')).toBe('AUTH.GOOGLE_ERROR');
    });
  });

  describe('errorCodeOf', () => {
    it('extrait le code uniquement s\'il est une chaîne', () => {
      expect(errorCodeOf({ code: 'auth/x' })).toBe('auth/x');
      expect(errorCodeOf({ code: 12 })).toBeUndefined();
      expect(errorCodeOf(null)).toBeUndefined();
    });
  });

  describe('isUserCancellation', () => {
    it('détecte une annulation par code ou par message', () => {
      expect(isUserCancellation({ code: 'auth/popup-closed-by-user' })).toBeTrue();
      expect(isUserCancellation(new Error('The user canceled the sign-in flow.'))).toBeTrue();
      expect(isUserCancellation(new Error('Network error'))).toBeFalse();
      expect(isUserCancellation(undefined)).toBeFalse();
    });
  });
});
