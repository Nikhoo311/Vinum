import { DEFAULT_STAR_WINE_CRITERION, STAR_WINE_CRITERIA, STAR_WINE_GROUPS, isStarWineCriterion, rankStarWines, resolveStarWine } from './star-wine.util';
import { makeWine } from './testing.fixtures';

const bottles = (count: number) => Array.from({ length: count }, (_, col) => ({ row: 0, col }));

describe('star-wine.util', () => {
  const cheapStock = makeWine({ id: 'cheap', name: 'Cheap', unitPrice: 8, rating: 3, vintage: 2020, placements: bottles(6), addedAt: '2026-01-10T10:00:00.000Z' });
  const dear = makeWine({ id: 'dear', name: 'Dear', unitPrice: 90, rating: 4.5, vintage: 2010, placements: bottles(1), addedAt: '2025-03-01T10:00:00.000Z' });
  const old = makeWine({ id: 'old', name: 'Old', unitPrice: 30, rating: 4.8, vintage: 1998, placements: bottles(2) });
  const cave = [cheapStock, dear, old];

  const best = (criterion: Parameters<typeof rankStarWines>[1]) => rankStarWines(cave, criterion)[0]?.wine.id;

  it('désigne le vin selon chaque critère', () => {
    expect(best('price')).toBe('dear');
    expect(best('cellar-value')).toBe('dear'); // 90 contre 48 (8 × 6) et 60 (30 × 2)
    expect(best('oldest-vintage')).toBe('old');
    expect(best('best-rated')).toBe('old');
    expect(best('best-value')).toBe('cheap'); // 3 / 8 = 0,375 contre 0,16 (4,8 / 30) et 0,05 (4,5 / 90)
    expect(best('biggest-stock')).toBe('cheap');
  });

  it('prend le vin ajouté le plus anciennement et ignore les fiches sans date', () => {
    expect(best('longest-in-cellar')).toBe('dear');
    expect(rankStarWines(cave, 'longest-in-cellar').map((r) => r.wine.id)).toEqual(['dear', 'cheap']);
  });

  it('écarte les vins sans la donnée du critère', () => {
    const noMillesime = makeWine({ id: 'nv', vintage: 0 });
    expect(rankStarWines([noMillesime], 'oldest-vintage')).toEqual([]);
    expect(rankStarWines([makeWine({ rating: undefined })], 'best-rated')).toEqual([]);
    expect(rankStarWines([makeWine({ unitPrice: 0, rating: 4 })], 'best-value')).toEqual([]);
    expect(rankStarWines([makeWine({ unitPrice: 0 })], 'price')).toEqual([]);
  });

  it('ignore les vins sans bouteille', () => {
    expect(rankStarWines([makeWine({ placements: [] })], 'price')).toEqual([]);
  });

  it('départage à score égal par le prix unitaire puis l’ordre alphabétique', () => {
    const a = makeWine({ id: 'a', name: 'B', rating: 4, unitPrice: 10 });
    const b = makeWine({ id: 'b', name: 'A', rating: 4, unitPrice: 20 });
    const c = makeWine({ id: 'c', name: 'A', rating: 4, unitPrice: 10 });
    expect(rankStarWines([a, c, b], 'best-rated').map((r) => r.wine.id)).toEqual(['b', 'c', 'a']);
  });

  it('garde le premier vin en cas d’égalité parfaite', () => {
    const first = makeWine({ id: 'b', unitPrice: 80 });
    const second = makeWine({ id: 'c', unitPrice: 80 });
    expect(rankStarWines([makeWine({ id: 'a', unitPrice: 10 }), first, second], 'price')[0].wine.id).toBe('b');
  });

  it('retombe sur le critère par défaut quand aucun vin ne correspond', () => {
    const result = resolveStarWine([makeWine({ rating: undefined, unitPrice: 12 })], 'best-rated');
    expect(result.fellBack).toBeTrue();
    expect(result.criterion).toBe(DEFAULT_STAR_WINE_CRITERION);
    expect(result.ranking.length).toBe(1);
  });

  it('ne se replie pas quand le critère retient un vin, ni sur une cave vide', () => {
    expect(resolveStarWine(cave, 'biggest-stock').fellBack).toBeFalse();
    const empty = resolveStarWine([], 'best-rated');
    expect(empty.ranking).toEqual([]);
  });

  it('valide les critères et les regroupe tous une seule fois', () => {
    expect(isStarWineCriterion('best-rated')).toBeTrue();
    expect(isStarWineCriterion('cheapest')).toBeFalse();
    expect(isStarWineCriterion(null)).toBeFalse();
    const grouped = STAR_WINE_GROUPS.flatMap((group) => group.criteria);
    expect([...grouped].sort()).toEqual([...STAR_WINE_CRITERIA].sort());
  });
});
