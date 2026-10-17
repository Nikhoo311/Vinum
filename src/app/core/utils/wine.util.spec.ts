import {
  compareWinesByName,
  formatFoodPairing,
  isHalfStep,
  isSameWine,
  normalizeText,
  normalizeWine,
  omitUndefined,
  parseFoodPairing,
  ratingKeySuffix,
} from './wine.util';
import { makeWine } from './testing.fixtures';

describe('wine.util', () => {
  describe('normalizeText', () => {
    it('compacte les espaces et passe en minuscules', () => {
      expect(normalizeText('  Château   MARGAUX ')).toBe('château margaux');
      expect(normalizeText(null)).toBe('');
    });
  });

  describe('isSameWine', () => {
    const base = makeWine();

    it('reconnaît le même vin malgré la casse et les espaces', () => {
      expect(isSameWine(base, makeWine({ name: '  château TEST ', domain: 'domaine test' }))).toBeTrue();
    });

    it('distingue millésime, type et appellation', () => {
      expect(isSameWine(base, makeWine({ vintage: 2019 }))).toBeFalse();
      expect(isSameWine(base, makeWine({ type: 'white' }))).toBeFalse();
      expect(isSameWine(base, makeWine({ appellation: 'Pauillac' }))).toBeFalse();
    });
  });

  describe('parseFoodPairing / formatFoodPairing', () => {
    it('découpe, nettoie et dédoublonne', () => {
      expect(parseFoodPairing(' Bœuf, fromage ,, bœuf ,Poisson')).toEqual(['Bœuf', 'fromage', 'Poisson']);
      expect(parseFoodPairing('')).toEqual([]);
      expect(parseFoodPairing(null)).toEqual([]);
    });

    it('reformate une liste', () => {
      expect(formatFoodPairing(['A', 'B'])).toBe('A, B');
      expect(formatFoodPairing(undefined)).toBe('');
    });
  });

  describe('isHalfStep', () => {
    it('accepte les pas de 0,5', () => {
      expect(isHalfStep(0)).toBeTrue();
      expect(isHalfStep(3.5)).toBeTrue();
      expect(isHalfStep(5)).toBeTrue();
    });

    it('refuse les autres valeurs', () => {
      expect(isHalfStep(3.3)).toBeFalse();
      expect(isHalfStep(Number.NaN)).toBeFalse();
    });
  });

  it('ratingKeySuffix remplace le point décimal', () => {
    expect(ratingKeySuffix(4.5)).toBe('4_5');
    expect(ratingKeySuffix(3)).toBe('3');
  });

  it('omitUndefined retire uniquement les propriétés undefined', () => {
    expect(omitUndefined<Record<string, unknown>>({ a: 1, b: undefined, c: null, d: 0 })).toEqual({ a: 1, c: null, d: 0 });
  });

  describe('normalizeWine', () => {
    it('rejette les documents inexploitables', () => {
      expect(normalizeWine(null)).toBeNull();
      expect(normalizeWine('x')).toBeNull();
      expect(normalizeWine({ name: 'A', type: 'inconnu' })).toBeNull();
      expect(normalizeWine({ type: 'red' })).toBeNull();
    });

    it('complète les champs manquants', () => {
      const wine = normalizeWine({ id: 'w1', name: 'A', type: 'red' }, 'owner');
      expect(wine).toEqual({
        id: 'w1',
        ownerId: 'owner',
        isCustom: true,
        name: 'A',
        domain: '',
        region: '',
        vintage: 0,
        type: 'red',
        unitPrice: 0,
        description: '',
        foodPairing: [],
        placements: [],
      });
    });

    it('écarte les placements invalides et conserve les champs optionnels valides', () => {
      const wine = normalizeWine({
        id: 'w1',
        name: 'A',
        type: 'white',
        rating: 4.5,
        peakMaturityYear: 2030,
        appellation: 'Chablis',
        grapeVariety: '',
        placements: [{ row: 0, col: 1 }, { row: -1, col: 0 }, { row: 1.5, col: 0 }, 'x', null],
        foodPairing: ['Poisson', 3],
      });
      expect(wine?.placements).toEqual([{ row: 0, col: 1 }]);
      expect(wine?.foodPairing).toEqual(['Poisson']);
      expect(wine?.rating).toBe(4.5);
      expect(wine?.peakMaturityYear).toBe(2030);
      expect(wine?.appellation).toBe('Chablis');
      expect('grapeVariety' in (wine ?? {})).toBeFalse();
    });
  });

  it('compareWinesByName trie sans tenir compte de la casse ni des accents', () => {
    const names = [makeWine({ name: 'zinfandel' }), makeWine({ name: 'Éclat' }), makeWine({ name: 'Bandol' })];
    expect(names.sort(compareWinesByName).map((wine) => wine.name)).toEqual(['Bandol', 'Éclat', 'zinfandel']);
  });
});
