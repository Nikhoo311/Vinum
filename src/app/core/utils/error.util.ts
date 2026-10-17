import { ERRORS_CODES } from '../types/ErrorsCode';

/**
 * Erreur applicative portant directement une clé de traduction.
 * Les services la lèvent pour les cas métier (utilisateur non connecté, mot de passe requis…).
 */
export class AppError extends Error {
  readonly key: string;
  readonly code?: string;

  constructor(key: string, code?: string) {
    super(key);
    this.name = 'AppError';
    this.key = key;
    this.code = code;
  }
}

/** Clés de traduction génériques utilisées pour les erreurs. */
export const ERROR_KEYS = {
  generic: 'ERRORS.GENERIC',
  network: 'ERRORS.NETWORK',
  notAuthenticated: 'ERRORS.NOT_AUTHENTICATED',
  permissionDenied: 'ERRORS.PERMISSION_DENIED',
} as const;

/** Correspondance entre un code d'erreur Firebase (Auth ou Firestore) et une clé de traduction. */
const CODE_TO_KEY: Readonly<Record<string, string>> = {
  [ERRORS_CODES.auth.userNotFound]: 'AUTH.NO_ACCOUNT',
  [ERRORS_CODES.auth.wrongPassword]: 'AUTH.INVALID_CREDENTIAL',
  [ERRORS_CODES.auth.invalidCredential]: 'AUTH.INVALID_CREDENTIAL',
  [ERRORS_CODES.auth.tooManyRequests]: 'AUTH.TOO_MANY_ATTEMPTS',
  [ERRORS_CODES.auth.emailAlreadyInUse]: 'AUTH.RULES.EMAIL_ALREADY_TAKEN',
  [ERRORS_CODES.auth.weakPassword]: 'AUTH.RULES.PASSWORD',
  [ERRORS_CODES.auth.invalidEmail]: 'AUTH.RULES.EMAIL',
  [ERRORS_CODES.auth.userDisabled]: 'AUTH.USER_DISABLED',
  [ERRORS_CODES.auth.requiresRecentLogin]: 'AUTH.REQUIRES_RECENT_LOGIN',
  [ERRORS_CODES.auth.networkRequestFailed]: ERROR_KEYS.network,
  unavailable: ERROR_KEYS.network,
  'permission-denied': ERROR_KEYS.permissionDenied,
};

/** Une clé de traduction ressemble à `SECTION.SOUS_SECTION.CLE`. */
const TRANSLATION_KEY = /^[A-Z][A-Z0-9_]*(\.[A-Z0-9_]+)+$/;

/** Extrait le code d'une erreur Firebase (`auth/…`, `permission-denied`…), si présent. */
export function errorCodeOf(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/**
 * Convertit n'importe quelle erreur en clé de traduction affichable.
 * Ordre : `AppError` → code Firebase connu → message déjà au format clé → `fallback`.
 */
export function toErrorKey(error: unknown, fallback: string = ERROR_KEYS.generic): string {
  if (error instanceof AppError) return error.key;

  const code = errorCodeOf(error);
  if (code && CODE_TO_KEY[code]) return CODE_TO_KEY[code];

  if (error instanceof Error && TRANSLATION_KEY.test(error.message)) return error.message;

  return fallback;
}

/** Vrai si l'utilisateur a lui-même annulé une connexion (fenêtre Google fermée). */
export function isUserCancellation(error: unknown): boolean {
  const code = errorCodeOf(error);
  if (code === ERRORS_CODES.auth.popupClosedByUser || code === ERRORS_CODES.auth.cancelledPopupRequest) {
    return true;
  }
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /cancel/i.test(message);
}
