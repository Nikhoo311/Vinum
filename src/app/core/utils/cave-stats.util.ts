import { UserWine } from '../models/wine.model';
import { WINE_TYPES, WineType } from '../types/WineType';

/** Répartition des bouteilles d'une région par type de vin. */
export interface RegionDistribution {
  name: string;
  bottles: number;
  types: [WineType, number][];
}

/** Statistiques agrégées d'une cave. */
export interface CaveStats {
  totalBottles: number;
  totalValue: number;
  /** Vin au prix unitaire le plus élevé (« vin star »), ou `null` si aucun. */
  starWine: UserWine | null;
  uniqueRegionsCount: number;
  ratedCount: number;
  /** Note moyenne sur 5, arrondie au dixième ; `0` si aucun vin noté. */
  averageRating: number;
  distributionByType: Record<WineType, number>;
  /** `distributionByType` sous forme de couples `[type, bouteilles]`, dans l'ordre d'affichage. */
  distributionEntries: [WineType, number][];
  regions: RegionDistribution[];
}

/** Clé de regroupement d'une région : « Rhône », « rhone » et « RHÔNE  » désignent la même. */
function regionKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function bottlesOf(wine: UserWine): number {
  return wine.placements?.length ?? 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Calcule toutes les statistiques de la cave en un seul passage. */
export function computeCaveStats(wines: readonly UserWine[]): CaveStats {
  const distributionByType = Object.fromEntries(
    WINE_TYPES.map((type) => [type, 0])
  ) as Record<WineType, number>;
  const regionMap = new Map<string, { bottles: number; types: Map<WineType, number>; spellings: Map<string, number> }>();

  let totalBottles = 0;
  let totalValue = 0;
  let starWine: UserWine | null = null;
  let ratingSum = 0;
  let ratedCount = 0;

  for (const wine of wines) {
    const bottles = bottlesOf(wine);
    totalBottles += bottles;

    if (isFiniteNumber(wine.unitPrice)) {
      totalValue += wine.unitPrice * bottles;
      if (wine.unitPrice > 0 && (starWine === null || wine.unitPrice > starWine.unitPrice)) {
        starWine = wine;
      }
    }

    if (isFiniteNumber(wine.rating)) {
      ratingSum += wine.rating;
      ratedCount++;
    }

    if (wine.type in distributionByType) {
      distributionByType[wine.type] += bottles;
    }

    const regionName = wine.region?.trim().replace(/\s+/g, ' ');
    if (regionName && bottles > 0) {
      const key = regionKey(regionName);
      const region = regionMap.get(key) ?? { bottles: 0, types: new Map<WineType, number>(), spellings: new Map<string, number>() };
      region.bottles += bottles;
      region.types.set(wine.type, (region.types.get(wine.type) ?? 0) + bottles);
      region.spellings.set(regionName, (region.spellings.get(regionName) ?? 0) + bottles);
      regionMap.set(key, region);
    }
  }

  const regions: RegionDistribution[] = [...regionMap.values()]
    .map((region) => ({
      // Orthographe affichée : la plus utilisée (la première saisie en cas d'égalité).
      name: [...region.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
      bottles: region.bottles,
      types: [...region.types.entries()].sort(
        ([a], [b]) => WINE_TYPES.indexOf(a) - WINE_TYPES.indexOf(b)
      ),
    }))
    .sort((a, b) => b.bottles - a.bottles || a.name.localeCompare(b.name));

  const uniqueRegions = new Set(
    wines.map((wine) => regionKey(wine.region ?? '')).filter(Boolean)
  );

  return {
    totalBottles,
    totalValue,
    starWine,
    uniqueRegionsCount: uniqueRegions.size,
    ratedCount,
    averageRating: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : 0,
    distributionByType,
    distributionEntries: WINE_TYPES.map((type): [WineType, number] => [type, distributionByType[type]]),
    regions,
  };
}

/** Taux de remplissage de la cave en pourcentage (0 si la capacité est nulle). */
export function fillPercentage(occupied: number, capacity: number): number {
  return capacity > 0 ? (occupied / capacity) * 100 : 0;
}

/** Part de `part` dans `total`, en pourcentage (0 si `total` est nul). */
export function percentageOf(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}
