import { WineType } from '../types/WineType';

/** Fournisseur d'authentification utilisé à la création du compte. */
export type AuthProvider = 'google' | 'password';

/** Mode d'affichage de la cave. */
export type CaveView = 'grid' | 'list';

/** Disposition physique de la cave de l'utilisateur. */
export interface CaveConfig {
  rows: number;
  cols: number;
  viewMode: CaveView;
}

/** Configuration d'une cave non encore paramétrée (onboarding non terminé). */
export const EMPTY_CAVE_CONFIG: Readonly<CaveConfig> = Object.freeze({
  rows: 0,
  cols: 0,
  viewMode: 'grid',
});

/**
 * Profil utilisateur persisté dans Firestore (`users/{uid}`).
 * `createdAt` est stocké sous forme de chaîne ISO 8601.
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  favoriteWineType: WineType | null;
  provider: AuthProvider;
  createdAt: string;
  caveConfig: CaveConfig;
}
