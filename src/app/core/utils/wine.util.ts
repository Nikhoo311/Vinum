import { CellPlacement, UserWine } from '../models/wine.model';
import { isWineType, WineType } from '../types/WineType';

/** Normalise un texte pour comparaison : espaces compactés, minuscules. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Deux fiches désignent le même vin si elles ont le même nom, domaine,
 * millésime, appellation et type (comparaison insensible à la casse).
 */
export function isSameWine(a: Pick<UserWine, 'name' | 'domain' | 'vintage' | 'appellation' | 'type'>,
                           b: Pick<UserWine, 'name' | 'domain' | 'vintage' | 'appellation' | 'type'>): boolean {
  return (
    normalizeText(a.name) === normalizeText(b.name) &&
    normalizeText(a.domain) === normalizeText(b.domain) &&
    a.vintage === b.vintage &&
    normalizeText(a.appellation) === normalizeText(b.appellation) &&
    a.type === b.type
  );
}

/** Transforme une saisie « Bœuf, fromage affiné » en liste sans doublon ni valeur vide. */
export function parseFoodPairing(input: string | null | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of (input ?? '').split(',')) {
    const item = part.trim();
    const key = item.toLowerCase();
    if (item && !seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/** Inverse de {@link parseFoodPairing}, pour pré-remplir un champ de saisie. */
export function formatFoodPairing(items: readonly string[] | null | undefined): string {
  return (items ?? []).join(', ');
}

/** Une note valide est comprise entre 0 et 5 par pas de 0,5. */
export function isHalfStep(value: number): boolean {
  return Number.isFinite(value) && (value * 2) % 1 === 0;
}

/** Suffixe de la clé de traduction d'une note (`4.5` → `4_5`). */
export function ratingKeySuffix(rating: number): string {
  return String(rating).replace('.', '_');
}

/** Retire les propriétés `undefined`, que Firestore refuse d'écrire. */
export function omitUndefined<T extends object>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as T;
}

function isPlacement(value: unknown): value is CellPlacement {
  if (typeof value !== 'object' || value === null) return false;
  const { row, col } = value as Record<string, unknown>;
  return Number.isInteger(row) && Number.isInteger(col) && (row as number) >= 0 && (col as number) >= 0;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Reconstruit un `UserWine` fiable à partir d'un document Firestore brut :
 * tableaux toujours présents, champs invalides écartés, aucune valeur `undefined` superflue.
 * Retourne `null` si le document est inexploitable (pas de nom ni de type).
 */
export function normalizeWine(raw: unknown, fallbackOwnerId = ''): UserWine | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Record<string, unknown>;

  if (typeof data['name'] !== 'string' || !isWineType(data['type'])) return null;

  const wine: UserWine = {
    ownerId: typeof data['ownerId'] === 'string' ? data['ownerId'] : fallbackOwnerId,
    isCustom: data['isCustom'] !== false,
    name: data['name'],
    domain: typeof data['domain'] === 'string' ? data['domain'] : '',
    region: typeof data['region'] === 'string' ? data['region'] : '',
    vintage: optionalNumber(data['vintage']) ?? 0,
    type: data['type'] as WineType,
    unitPrice: optionalNumber(data['unitPrice']) ?? 0,
    description: typeof data['description'] === 'string' ? data['description'] : '',
    foodPairing: Array.isArray(data['foodPairing'])
      ? data['foodPairing'].filter((item): item is string => typeof item === 'string')
      : [],
    placements: Array.isArray(data['placements']) ? data['placements'].filter(isPlacement) : [],
  };

  const id = optionalString(data['id']);
  if (id) wine.id = id;
  const catalogueId = optionalString(data['wineCatalogueId']);
  if (catalogueId) wine.wineCatalogueId = catalogueId;
  const appellation = optionalString(data['appellation']);
  if (appellation) wine.appellation = appellation;
  const grapeVariety = optionalString(data['grapeVariety']);
  if (grapeVariety) wine.grapeVariety = grapeVariety;
  const rating = optionalNumber(data['rating']);
  if (rating !== undefined) wine.rating = rating;
  const addedAt = optionalString(data['addedAt']);
  if (addedAt) wine.addedAt = addedAt;
  const peak = optionalNumber(data['peakMaturityYear']);
  if (peak !== undefined) wine.peakMaturityYear = peak;

  return wine;
}

/** Comparateur alphabétique insensible aux accents et à la casse. */
export function compareWinesByName(a: UserWine, b: UserWine): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}
