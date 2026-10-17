import { User } from '../models/user.model';
import { hasCompletedSetup, normalizeUser, toIsoString } from './user.util';

const BASE: User = {
  id: 'uid-1',
  email: 'base@example.com',
  firstName: '',
  lastName: '',
  favoriteWineType: null,
  provider: 'password',
  createdAt: '2024-01-01T00:00:00.000Z',
  caveConfig: { rows: 0, cols: 0, viewMode: 'grid' },
};

describe('user.util', () => {
  describe('hasCompletedSetup', () => {
    it('est faux tant que la cave n\'est pas configurée', () => {
      expect(hasCompletedSetup(null)).toBeFalse();
      expect(hasCompletedSetup(BASE)).toBeFalse();
      expect(hasCompletedSetup({ caveConfig: { rows: 3, cols: 0, viewMode: 'grid' } })).toBeFalse();
    });

    it('est vrai dès qu\'une rangée et une colonne existent', () => {
      expect(hasCompletedSetup({ caveConfig: { rows: 2, cols: 3, viewMode: 'list' } })).toBeTrue();
    });
  });

  describe('toIsoString', () => {
    const fallback = '2000-01-01T00:00:00.000Z';

    it('accepte chaîne ISO, Date et objet de type Timestamp', () => {
      expect(toIsoString('2024-05-06T07:08:09.000Z', fallback)).toBe('2024-05-06T07:08:09.000Z');
      expect(toIsoString(new Date('2024-05-06T07:08:09.000Z'), fallback)).toBe('2024-05-06T07:08:09.000Z');
      const timestamp = { toDate: () => new Date('2024-05-06T07:08:09.000Z') };
      expect(toIsoString(timestamp, fallback)).toBe('2024-05-06T07:08:09.000Z');
    });

    it('retombe sur la valeur par défaut sinon', () => {
      expect(toIsoString('pas une date', fallback)).toBe(fallback);
      expect(toIsoString(undefined, fallback)).toBe(fallback);
      expect(toIsoString(42, fallback)).toBe(fallback);
    });
  });

  describe('normalizeUser', () => {
    it('retourne la base si le document est absent', () => {
      expect(normalizeUser(undefined, BASE)).toEqual(BASE);
    });

    it('fusionne un document complet', () => {
      const user = normalizeUser(
        {
          email: 'stored@example.com',
          firstName: 'Camille',
          lastName: 'Dubois',
          favoriteWineType: 'rose',
          provider: 'google',
          createdAt: '2023-02-03T04:05:06.000Z',
          caveConfig: { rows: 4, cols: 6, viewMode: 'list' },
        },
        BASE
      );
      expect(user).toEqual({
        id: 'uid-1',
        email: 'stored@example.com',
        firstName: 'Camille',
        lastName: 'Dubois',
        favoriteWineType: 'rose',
        provider: 'google',
        createdAt: '2023-02-03T04:05:06.000Z',
        caveConfig: { rows: 4, cols: 6, viewMode: 'list' },
      });
    });

    it('écarte les valeurs invalides', () => {
      const user = normalizeUser(
        {
          email: '',
          favoriteWineType: 'bière',
          provider: 'facebook',
          caveConfig: { rows: -2, cols: 'x', viewMode: 'carousel' },
        },
        BASE
      );
      expect(user.email).toBe(BASE.email);
      expect(user.favoriteWineType).toBeNull();
      expect(user.provider).toBe('password');
      expect(user.caveConfig).toEqual({ rows: 0, cols: 0, viewMode: 'grid' });
    });

    it('impose toujours l\'identifiant du compte authentifié', () => {
      expect(normalizeUser({ id: 'autre' }, BASE).id).toBe('uid-1');
    });
  });
});
