import { UserWine } from '../models/wine.model';

/**
 * Critères pour désigner le « vin star » du tableau de bord.
 * L'utilisateur en choisit un (Réglages → Calcul du vin star).
 */
export const STAR_WINE_CRITERIA = [
  'price',
  'cellar-value',
  'oldest-vintage',
  'best-rated',
  'best-value',
  'longest-in-cellar',
  'biggest-stock',
] as const;

export type StarWineCriterion = (typeof STAR_WINE_CRITERIA)[number];

/** Critère par défaut, et critère de repli quand aucun vin ne correspond au critère choisi. */
export const DEFAULT_STAR_WINE_CRITERION: StarWineCriterion = 'price';

/** Regroupement des critères dans l'écran de réglage. */
export const STAR_WINE_GROUPS: readonly { key: 'VALUE' | 'CHARACTER' | 'OTHER'; criteria: readonly StarWineCriterion[] }[] = [
  { key: 'VALUE', criteria: ['price', 'cellar-value'] },
  { key: 'CHARACTER', criteria: ['oldest-vintage', 'best-rated', 'best-value'] },
  { key: 'OTHER', criteria: ['longest-in-cellar', 'biggest-stock'] },
];

export function isStarWineCriterion(value: unknown): value is StarWineCriterion {
  return typeof value === 'string' && (STAR_WINE_CRITERIA as readonly string[]).includes(value);
}

/** Vin classé : plus le score est élevé, mieux il est placé. */
export interface RankedWine {
  wine: UserWine;
  score: number;
}

/** Résultat du calcul : classement, critère réellement appliqué et indication de repli. */
export interface StarWineResult {
  /** Critère appliqué (le critère par défaut si aucun vin ne correspondait au critère demandé). */
  criterion: StarWineCriterion;
  /** Vrai si le critère demandé ne retenait aucun vin et que le critère par défaut a été utilisé. */
  fellBack: boolean;
  ranking: RankedWine[];
}

function bottlesOf(wine: UserWine): number {
  return wine.placements?.length ?? 0;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Score d'un vin pour un critère, ou `null` s'il ne peut pas être évalué (donnée manquante). */
function scoreOf(wine: UserWine, criterion: StarWineCriterion): number | null {
  const price = finite(wine.unitPrice) ? wine.unitPrice : 0;

  switch (criterion) {
    case 'price':
      return price > 0 ? price : null;
    case 'cellar-value':
      return price > 0 ? price * bottlesOf(wine) : null;
    case 'oldest-vintage':
      // Les vins sans millésime (0) sont écartés.
      return finite(wine.vintage) && wine.vintage > 0 ? -wine.vintage : null;
    case 'best-rated':
      return finite(wine.rating) && wine.rating > 0 ? wine.rating : null;
    case 'best-value':
      return finite(wine.rating) && wine.rating > 0 && price > 0 ? wine.rating / price : null;
    case 'longest-in-cellar': {
      // Les anciennes fiches n'ont pas de date d'ajout : elles sont écartées.
      const added = wine.addedAt ? Date.parse(wine.addedAt) : NaN;
      return Number.isNaN(added) ? null : -added;
    }
    case 'biggest-stock':
      return bottlesOf(wine);
  }
}

/**
 * Classe les vins (au moins une bouteille) selon un critère, du meilleur au moins bon.
 * À score égal : prix unitaire le plus élevé, puis ordre alphabétique, puis ordre d'origine.
 */
export function rankStarWines(wines: readonly UserWine[], criterion: StarWineCriterion): RankedWine[] {
  const ranked: RankedWine[] = [];
  for (const wine of wines) {
    if (bottlesOf(wine) === 0) continue;
    const score = scoreOf(wine, criterion);
    if (score !== null) ranked.push({ wine, score });
  }

  return ranked.sort(
    (a, b) =>
      b.score - a.score ||
      (b.wine.unitPrice || 0) - (a.wine.unitPrice || 0) ||
      a.wine.name.localeCompare(b.wine.name, 'fr')
  );
}

/** Désigne le vin star : applique le critère, ou le critère par défaut si aucun vin n'est éligible. */
export function resolveStarWine(wines: readonly UserWine[], criterion: StarWineCriterion): StarWineResult {
  const ranking = rankStarWines(wines, criterion);
  if (ranking.length > 0 || criterion === DEFAULT_STAR_WINE_CRITERION) {
    return { criterion, fellBack: false, ranking };
  }

  return {
    criterion: DEFAULT_STAR_WINE_CRITERION,
    fellBack: true,
    ranking: rankStarWines(wines, DEFAULT_STAR_WINE_CRITERION),
  };
}
