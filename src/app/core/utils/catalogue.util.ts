import {
  CatalogueSort,
  CatalogueStatus,
  CatalogueWine,
} from '../models/catalogue-wine.model';
import { CellPlacement, UserWine } from '../models/wine.model';
import { WineType, isWineType } from '../types/WineType';
import { buildGrid, formatPlacement } from './placement.util';
import { normalizeSearchText } from './search.util';

/** Valeur du filtre « région » qui ne filtre rien. */
export const ALL_REGIONS = 'all';

/** Critères de recherche et de tri du catalogue. */
export interface CatalogueCriteria {
  query: string;
  types: ReadonlySet<WineType>;
  region: string;
  status: CatalogueStatus;
  sort: CatalogueSort;
}

/** Emplacement libre de la cave, avec son libellé (`A3`). */
export interface FreeSlot extends CellPlacement {
  label: string;
}

/** Indique si au moins un critère restreint ou réordonne la liste. */
export function countActiveFilters(criteria: CatalogueCriteria): number {
  return (
    criteria.types.size +
    (criteria.region !== ALL_REGIONS ? 1 : 0) +
    (criteria.status !== 'all' ? 1 : 0) +
    (criteria.sort !== 'name' ? 1 : 0)
  );
}

/**
 * Nombre de bouteilles en cave correspondant à un vin du catalogue : la fiche liée par
 * `wineCatalogueId`, ou à défaut une fiche de même nom, domaine et millésime.
 */
export function countBottles(wine: CatalogueWine, cave: readonly UserWine[]): number {
  const name = normalizeSearchText(wine.name);
  const domain = normalizeSearchText(wine.domain);
  const vintage = Number(wine.vintage);

  return cave
    .filter(
      (item) =>
        item.wineCatalogueId === wine.id ||
        (normalizeSearchText(item.name) === name &&
          normalizeSearchText(item.domain ?? '') === domain &&
          item.vintage === vintage)
    )
    .reduce((total, item) => total + (item.placements?.length ?? 0), 0);
}

/** Ajoute `inCave` à chaque vin. */
export function withCellarFlag(wines: readonly CatalogueWine[], cave: readonly UserWine[]): CatalogueWine[] {
  return wines.map((wine) => ({ ...wine, inCave: countBottles(wine, cave) > 0 }));
}

/** Filtre puis trie les vins du catalogue. */
export function filterCatalogue(
  wines: readonly CatalogueWine[],
  criteria: CatalogueCriteria,
  wishlist: ReadonlySet<string>,
  cave: readonly UserWine[]
): CatalogueWine[] {
  const terms = normalizeSearchText(criteria.query).split(/\s+/).filter(Boolean);

  const matches = withCellarFlag(wines, cave).filter((wine) => {
    if (criteria.types.size > 0 && !criteria.types.has(wine.type)) return false;
    if (criteria.region !== ALL_REGIONS && wine.region !== criteria.region) return false;
    if (criteria.status === 'wishlist' && !wishlist.has(wine.id)) return false;
    if (criteria.status === 'cellar' && !wine.inCave) return false;
    if (terms.length === 0) return true;

    const haystack = normalizeSearchText(
      [wine.name, wine.domain, wine.region, wine.grapeVariety, wine.vintage].join(' ')
    );
    return terms.every((term) => haystack.includes(term));
  });

  return matches.sort((a, b) => compareCatalogueWines(a, b, criteria.sort));
}

function compareCatalogueWines(a: CatalogueWine, b: CatalogueWine, sort: CatalogueSort): number {
  switch (sort) {
    case 'price-asc':
      return a.unitPrice - b.unitPrice;
    case 'price-desc':
      return b.unitPrice - a.unitPrice;
    case 'vintage-desc':
      return (Number(b.vintage) || 0) - (Number(a.vintage) || 0);
    default:
      return a.name.localeCompare(b.name, 'fr');
  }
}

/** Régions distinctes (sans tenir compte de la casse ni des accents), triées alphabétiquement. */
export function listRegions(wines: readonly CatalogueWine[]): string[] {
  const byKey = new Map<string, string>();
  for (const wine of wines) {
    const region = wine.region?.trim();
    if (region && !byKey.has(normalizeSearchText(region))) byKey.set(normalizeSearchText(region), region);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Emplacements libres de la cave, ligne par ligne. */
export function listFreeSlots(rows: number, cols: number, cave: readonly UserWine[]): FreeSlot[] {
  return buildGrid(rows, cols, cave)
    .filter((slot) => slot.wine === null)
    .map(({ row, col }) => ({ row, col, label: formatPlacement({ row, col }) }));
}

/** Vins de la liste de souhaits, dans l'ordre du catalogue. */
export function pickWishlisted(wines: readonly CatalogueWine[], wishlist: ReadonlySet<string>): CatalogueWine[] {
  return wines.filter((wine) => wishlist.has(wine.id));
}

/** Somme des prix unitaires de la liste de souhaits. */
export function wishlistTotal(wines: readonly CatalogueWine[]): number {
  return wines.reduce((total, wine) => total + (Number.isFinite(wine.unitPrice) ? wine.unitPrice : 0), 0);
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Convertit un document Firestore en vin de catalogue, ou `null` s'il est inexploitable
 * (sans nom ni type valide). Les champs absents ou mal typés reçoivent une valeur neutre.
 */
export function toCatalogueWine(id: string, data: unknown): CatalogueWine | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;

  const name = asText(raw['name']);
  if (!name || !isWineType(raw['type'])) return null;

  const vintage = typeof raw['vintage'] === 'string' ? raw['vintage'] : asFiniteNumber(raw['vintage']) ?? 0;
  const wine: CatalogueWine = {
    id,
    name,
    domain: asText(raw['domain']),
    region: asText(raw['region']),
    vintage,
    type: raw['type'],
    grapeVariety: asText(raw['grapeVariety']),
    unitPrice: asFiniteNumber(raw['unitPrice']) ?? 0,
    description: asText(raw['description']),
    foodPairing: Array.isArray(raw['foodPairing'])
      ? raw['foodPairing'].filter((item): item is string => typeof item === 'string')
      : [],
  };

  const rating = asFiniteNumber(raw['rating']);
  if (rating !== undefined) wine.rating = rating;
  const peak = asFiniteNumber(raw['peakMaturityYear']);
  if (peak !== undefined) wine.peakMaturityYear = peak;

  return wine;
}
