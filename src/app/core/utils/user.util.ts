import { AuthProvider, CaveConfig, CaveView, EMPTY_CAVE_CONFIG, User } from '../models/user.model';
import { isWineType } from '../types/WineType';

/** Nombre de rangées/colonnes maximal accepté (plafond de l'offre premium). */
export const CAVE_MAX_DIMENSION = 240;

/** L'onboarding est terminé lorsque la cave a au moins une rangée et une colonne. */
export function hasCompletedSetup(user: Pick<User, 'caveConfig'> | null | undefined): boolean {
  const config = user?.caveConfig;
  return !!config && config.rows > 0 && config.cols > 0;
}

/** Convertit une date (chaîne, `Date` ou `Timestamp` Firestore) en chaîne ISO 8601. */
export function toIsoString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const toDate = (value as { toDate: () => unknown }).toDate;
    if (typeof toDate === 'function') {
      const date = toDate.call(value);
      if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString();
    }
  }
  return fallback;
}

function toDimension(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= CAVE_MAX_DIMENSION
    ? value
    : fallback;
}

function toViewMode(value: unknown, fallback: CaveView): CaveView {
  return value === 'grid' || value === 'list' ? value : fallback;
}

function toProvider(value: unknown, fallback: AuthProvider): AuthProvider {
  return value === 'google' || value === 'password' ? value : fallback;
}

/**
 * Fusionne un document utilisateur Firestore (potentiellement ancien ou incomplet)
 * avec les valeurs par défaut `base` déduites du compte Firebase Auth.
 * Garantit un `User` complet et correctement typé.
 */
export function normalizeUser(raw: unknown, base: User): User {
  if (typeof raw !== 'object' || raw === null) return base;
  const data = raw as Record<string, unknown>;
  const config = (typeof data['caveConfig'] === 'object' && data['caveConfig'] !== null
    ? data['caveConfig']
    : {}) as Record<string, unknown>;

  const caveConfig: CaveConfig = {
    rows: toDimension(config['rows'], EMPTY_CAVE_CONFIG.rows),
    cols: toDimension(config['cols'], EMPTY_CAVE_CONFIG.cols),
    viewMode: toViewMode(config['viewMode'], EMPTY_CAVE_CONFIG.viewMode),
  };

  return {
    id: base.id,
    email: typeof data['email'] === 'string' && data['email'] ? data['email'] : base.email,
    firstName: typeof data['firstName'] === 'string' ? data['firstName'] : base.firstName,
    lastName: typeof data['lastName'] === 'string' ? data['lastName'] : base.lastName,
    favoriteWineType: isWineType(data['favoriteWineType']) ? data['favoriteWineType'] : null,
    provider: toProvider(data['provider'], base.provider),
    createdAt: toIsoString(data['createdAt'], base.createdAt),
    caveConfig,
  };
}
