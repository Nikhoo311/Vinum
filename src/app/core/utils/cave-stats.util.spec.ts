import { computeCaveStats, fillPercentage, percentageOf } from './cave-stats.util';
import { makeWine } from './testing.fixtures';

describe('cave-stats.util', () => {
  it('retourne des statistiques vides pour une cave vide', () => {
    const stats = computeCaveStats([]);
    expect(stats.totalBottles).toBe(0);
    expect(stats.totalValue).toBe(0);
    expect(stats.starWine).toBeNull();
    expect(stats.uniqueRegionsCount).toBe(0);
    expect(stats.averageRating).toBe(0);
    expect(stats.ratedCount).toBe(0);
    expect(stats.regions).toEqual([]);
    expect(stats.distributionByType).toEqual({ red: 0, white: 0, rose: 0, champagne: 0 });
  });

  it('compte les bouteilles et calcule la valeur totale', () => {
    const stats = computeCaveStats([
      makeWine({ id: 'a', unitPrice: 10, placements: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }),
      makeWine({ id: 'b', unitPrice: 50, placements: [{ row: 1, col: 0 }] }),
    ]);
    expect(stats.totalBottles).toBe(3);
    expect(stats.totalValue).toBe(70);
  });

  it('désigne le vin le plus cher comme vin star (le premier en cas d\'égalité)', () => {
    const cheap = makeWine({ id: 'a', unitPrice: 10 });
    const first = makeWine({ id: 'b', unitPrice: 80 });
    const second = makeWine({ id: 'c', unitPrice: 80 });
    expect(computeCaveStats([cheap, first, second]).starWine?.id).toBe('b');
  });

  it('n\'élit aucun vin star si aucun prix n\'est renseigné', () => {
    expect(computeCaveStats([makeWine({ unitPrice: 0 })]).starWine).toBeNull();
  });

  it('calcule la note moyenne arrondie au dixième sur les vins notés uniquement', () => {
    const stats = computeCaveStats([
      makeWine({ id: 'a', rating: 4 }),
      makeWine({ id: 'b', rating: 4.5 }),
      makeWine({ id: 'c', rating: 3 }),
      makeWine({ id: 'd' }),
    ]);
    expect(stats.ratedCount).toBe(3);
    expect(stats.averageRating).toBe(3.8);
  });

  it('répartit les bouteilles par type', () => {
    const stats = computeCaveStats([
      makeWine({ id: 'a', type: 'red', placements: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }),
      makeWine({ id: 'b', type: 'white', placements: [{ row: 1, col: 0 }] }),
    ]);
    expect(stats.distributionByType).toEqual({ red: 2, white: 1, rose: 0, champagne: 0 });
    expect(stats.distributionEntries).toEqual([['red', 2], ['white', 1], ['rose', 0], ['champagne', 0]]);
  });

  it('agrège les régions, triées par nombre de bouteilles décroissant', () => {
    const stats = computeCaveStats([
      makeWine({ id: 'a', region: 'Bordeaux', type: 'red', placements: [{ row: 0, col: 0 }] }),
      makeWine({ id: 'b', region: ' Bordeaux ', type: 'white', placements: [{ row: 0, col: 1 }, { row: 0, col: 2 }] }),
      makeWine({ id: 'c', region: 'Alsace', type: 'white', placements: [{ row: 1, col: 0 }] }),
      makeWine({ id: 'd', region: '', placements: [{ row: 1, col: 1 }] }),
    ]);
    expect(stats.uniqueRegionsCount).toBe(2);
    expect(stats.regions.map((region) => [region.name, region.bottles])).toEqual([
      ['Bordeaux', 3],
      ['Alsace', 1],
    ]);
    expect(stats.regions[0].types).toEqual([['red', 1], ['white', 2]]);
  });

  it('ignore les valeurs non numériques', () => {
    const wine = makeWine({ unitPrice: Number.NaN, rating: Number.NaN });
    const stats = computeCaveStats([wine]);
    expect(stats.totalValue).toBe(0);
    expect(stats.ratedCount).toBe(0);
  });

  describe('fillPercentage / percentageOf', () => {
    it('calcule les pourcentages', () => {
      expect(fillPercentage(6, 24)).toBe(25);
      expect(percentageOf(1, 4)).toBe(25);
    });

    it('évite la division par zéro', () => {
      expect(fillPercentage(3, 0)).toBe(0);
      expect(percentageOf(3, 0)).toBe(0);
    });
  });

  it("regroupe les orthographes d'une même région (casse, accents, tirets, espaces)", () => {
    const one = [{ row: 0, col: 0 }];
    const stats = computeCaveStats([
      makeWine({ id: 'a', region: 'Rhône', placements: one }),
      makeWine({ id: 'b', region: 'rhone', placements: one }),
      makeWine({ id: 'c', region: 'Rhône ', placements: one }),
      makeWine({ id: 'd', region: 'Côtes-du-Rhône', placements: one }),
      makeWine({ id: 'e', region: 'Côtes du  Rhône', placements: one }),
    ]);

    expect(stats.regions.map((r) => [r.name, r.bottles])).toEqual([['Rhône', 3], ['Côtes-du-Rhône', 2]]);
    expect(stats.uniqueRegionsCount).toBe(2);
  });
});
