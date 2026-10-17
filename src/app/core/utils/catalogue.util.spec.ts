import { CatalogueWine } from '../models/catalogue-wine.model';
import { WineType } from '../types/WineType';
import {
  ALL_REGIONS,
  CatalogueCriteria,
  countActiveFilters,
  countBottles,
  filterCatalogue,
  listFreeSlots,
  listRegions,
  toCatalogueWine,
  wishlistTotal,
} from './catalogue.util';
import { makeWine } from './testing.fixtures';

function wine(overrides: Partial<CatalogueWine> = {}): CatalogueWine {
  return {
    id: 'w1',
    name: 'Château Lacave',
    domain: 'Château Lacave',
    region: 'Bordeaux',
    vintage: 2018,
    type: WineType.RED,
    grapeVariety: 'Merlot',
    unitPrice: 28,
    ...overrides,
  };
}

const NO_FILTER: CatalogueCriteria = {
  query: '',
  types: new Set<WineType>(),
  region: ALL_REGIONS,
  status: 'all',
  sort: 'name',
};

describe('catalogue.util', () => {
  const catalogue = [
    wine({ id: 'a', name: 'Sancerre', region: 'Loire', type: WineType.WHITE, unitPrice: 18, vintage: 2021 }),
    wine({ id: 'b', name: 'Bourgogne', region: 'Bourgogne', unitPrice: 24, vintage: 2019 }),
    wine({ id: 'c', name: 'Champagne', region: 'Champagne', type: WineType.CHAMPAGNE, unitPrice: 32, vintage: 'NV' }),
  ];

  describe('filterCatalogue', () => {
    it('trie par nom par défaut', () => {
      expect(filterCatalogue(catalogue, NO_FILTER, new Set(), []).map((w) => w.id)).toEqual(['b', 'c', 'a']);
    });

    it('filtre par type, région et recherche sans accent', () => {
      const byType = filterCatalogue(catalogue, { ...NO_FILTER, types: new Set([WineType.WHITE]) }, new Set(), []);
      expect(byType.map((w) => w.id)).toEqual(['a']);

      const byRegion = filterCatalogue(catalogue, { ...NO_FILTER, region: 'Bourgogne' }, new Set(), []);
      expect(byRegion.map((w) => w.id)).toEqual(['b']);

      const bySearch = filterCatalogue(catalogue, { ...NO_FILTER, query: 'LOIRE sancerre' }, new Set(), []);
      expect(bySearch.map((w) => w.id)).toEqual(['a']);
    });

    it('applique le tri par prix et par millésime', () => {
      expect(filterCatalogue(catalogue, { ...NO_FILTER, sort: 'price-desc' }, new Set(), []).map((w) => w.id)).toEqual(['c', 'b', 'a']);
      expect(filterCatalogue(catalogue, { ...NO_FILTER, sort: 'price-asc' }, new Set(), []).map((w) => w.id)).toEqual(['a', 'b', 'c']);
      expect(filterCatalogue(catalogue, { ...NO_FILTER, sort: 'vintage-desc' }, new Set(), []).map((w) => w.id)).toEqual(['a', 'b', 'c']);
    });

    it('filtre par statut', () => {
      const cave = [makeWine({ wineCatalogueId: 'b', placements: [{ row: 0, col: 0 }] })];

      const wished = filterCatalogue(catalogue, { ...NO_FILTER, status: 'wishlist' }, new Set(['a']), cave);
      expect(wished.map((w) => w.id)).toEqual(['a']);

      const owned = filterCatalogue(catalogue, { ...NO_FILTER, status: 'cellar' }, new Set(), cave);
      expect(owned.map((w) => w.id)).toEqual(['b']);
      expect(owned[0].inCave).toBeTrue();
    });
  });

  describe('countBottles', () => {
    it('compte via l’identifiant du catalogue', () => {
      const cave = [makeWine({ wineCatalogueId: 'a', placements: [{ row: 0, col: 0 }, { row: 0, col: 1 }] })];
      expect(countBottles(catalogue[0], cave)).toBe(2);
    });

    it('compte via nom, domaine et millésime sans tenir compte des accents', () => {
      const cave = [makeWine({ name: 'chateau lacave', domain: 'CHATEAU LACAVE', vintage: 2018 })];
      expect(countBottles(wine(), cave)).toBe(1);
    });

    it('retourne 0 sans correspondance', () => {
      expect(countBottles(wine(), [makeWine({ name: 'Autre' })])).toBe(0);
    });
  });

  it('listRegions dédoublonne sans tenir compte de la casse ni des accents', () => {
    const regions = listRegions([wine({ region: 'Rhône' }), wine({ region: 'rhone' }), wine({ region: 'Alsace' })]);
    expect(regions).toEqual(['Alsace', 'Rhône']);
  });

  it('listFreeSlots exclut les cases occupées', () => {
    const cave = [makeWine({ placements: [{ row: 0, col: 0 }] })];
    expect(listFreeSlots(1, 3, cave).map((slot) => slot.label)).toEqual(['A2', 'A3']);
  });

  it('countActiveFilters compte chaque critère actif', () => {
    expect(countActiveFilters(NO_FILTER)).toBe(0);
    expect(
      countActiveFilters({ ...NO_FILTER, types: new Set([WineType.RED, WineType.ROSE]), region: 'Loire', status: 'cellar', sort: 'price-asc' })
    ).toBe(5);
  });

  it('wishlistTotal additionne les prix', () => {
    expect(wishlistTotal(catalogue)).toBe(74);
    expect(wishlistTotal([])).toBe(0);
  });

  describe('toCatalogueWine', () => {
    it('convertit un document valide', () => {
      const result = toCatalogueWine('x', { name: ' Test ', type: 'red', vintage: 2020, unitPrice: 12, foodPairing: ['a', 3], rating: 4 });
      expect(result?.name).toBe('Test');
      expect(result?.foodPairing).toEqual(['a']);
      expect(result?.rating).toBe(4);
      expect(result?.peakMaturityYear).toBeUndefined();
    });

    it('rejette un document sans nom ou au type inconnu', () => {
      expect(toCatalogueWine('x', { type: 'red' })).toBeNull();
      expect(toCatalogueWine('x', { name: 'A', type: 'orange' })).toBeNull();
      expect(toCatalogueWine('x', null)).toBeNull();
    });
  });
});
