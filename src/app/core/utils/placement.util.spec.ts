import {
  buildGrid,
  columnLetters,
  comparePlacements,
  findFreePlacements,
  formatPlacement,
  isWithinBounds,
  planResize,
} from './placement.util';
import { makeWine } from './testing.fixtures';

describe('placement.util', () => {
  describe('columnLetters', () => {
    it('convertit les index en libellés façon tableur', () => {
      expect(columnLetters(0)).toBe('A');
      expect(columnLetters(25)).toBe('Z');
      expect(columnLetters(26)).toBe('AA');
      expect(columnLetters(27)).toBe('AB');
      expect(columnLetters(51)).toBe('AZ');
      expect(columnLetters(52)).toBe('BA');
    });

    it('retourne une chaîne vide pour une valeur invalide', () => {
      expect(columnLetters(-1)).toBe('');
      expect(columnLetters(Number.NaN)).toBe('');
    });
  });

  describe('formatPlacement', () => {
    it('formate un emplacement', () => {
      expect(formatPlacement({ row: 0, col: 0 })).toBe('A1');
      expect(formatPlacement({ row: 2, col: 9 })).toBe('C10');
      expect(formatPlacement({ row: 26, col: 0 })).toBe('AA1');
    });

    it('gère les valeurs absentes', () => {
      expect(formatPlacement(null)).toBe('');
      expect(formatPlacement(undefined)).toBe('');
    });
  });

  describe('comparePlacements', () => {
    it('trie par ligne puis par colonne (A2 avant A10)', () => {
      const sorted = [
        { row: 1, col: 0 },
        { row: 0, col: 9 },
        { row: 0, col: 1 },
      ].sort(comparePlacements);
      expect(sorted.map(formatPlacement)).toEqual(['A2', 'A10', 'B1']);
    });
  });

  describe('isWithinBounds', () => {
    it('vérifie les limites de la grille', () => {
      expect(isWithinBounds({ row: 0, col: 0 }, 2, 2)).toBeTrue();
      expect(isWithinBounds({ row: 1, col: 1 }, 2, 2)).toBeTrue();
      expect(isWithinBounds({ row: 2, col: 0 }, 2, 2)).toBeFalse();
      expect(isWithinBounds({ row: 0, col: 2 }, 2, 2)).toBeFalse();
      expect(isWithinBounds({ row: -1, col: 0 }, 2, 2)).toBeFalse();
    });
  });

  describe('buildGrid', () => {
    it('crée rows × cols cases dans l\'ordre ligne par ligne', () => {
      const grid = buildGrid(2, 3, []);
      expect(grid.length).toBe(6);
      expect(grid[0]).toEqual({ row: 0, col: 0, wine: null });
      expect(grid[5]).toEqual({ row: 1, col: 2, wine: null });
    });

    it('place les vins sur leurs emplacements', () => {
      const wine = makeWine({ placements: [{ row: 0, col: 1 }, { row: 1, col: 2 }] });
      const grid = buildGrid(2, 3, [wine]);
      expect(grid.filter((slot) => slot.wine !== null).map((slot) => formatPlacement(slot))).toEqual(['A2', 'B3']);
    });

    it('retourne une grille vide si la cave n\'est pas configurée', () => {
      expect(buildGrid(0, 0, [])).toEqual([]);
      expect(buildGrid(3, 0, [])).toEqual([]);
    });
  });

  describe('findFreePlacements', () => {
    const occupied = makeWine({ placements: [{ row: 0, col: 1 }] });

    it('saute les emplacements occupés', () => {
      const result = findFreePlacements(2, 2, [occupied], { row: 0, col: 0 }, 2);
      expect(result.map(formatPlacement)).toEqual(['A1', 'B1']);
    });

    it('repart du début de la cave en fin de parcours', () => {
      const result = findFreePlacements(2, 2, [occupied], { row: 1, col: 1 }, 3);
      expect(result.map(formatPlacement)).toEqual(['B2', 'A1', 'B1']);
    });

    it('retourne moins d\'emplacements que demandé si la cave est pleine', () => {
      const result = findFreePlacements(1, 2, [occupied], null, 5);
      expect(result.map(formatPlacement)).toEqual(['A1']);
    });

    it('démarre à 0 si le point de départ est hors grille', () => {
      const result = findFreePlacements(2, 2, [], { row: 9, col: 9 }, 1);
      expect(result.map(formatPlacement)).toEqual(['A1']);
    });

    it('gère une quantité ou une cave nulle', () => {
      expect(findFreePlacements(2, 2, [], null, 0)).toEqual([]);
      expect(findFreePlacements(0, 0, [], null, 3)).toEqual([]);
    });
  });

  describe('planResize', () => {
    it('ne prévoit rien si tout tient dans la nouvelle grille', () => {
      const plan = planResize([makeWine()], 2, 2);
      expect(plan).toEqual({ updates: [], deletions: [], removedBottles: 0 });
    });

    it('retire uniquement les placements hors limites', () => {
      const wine = makeWine({ id: 'a', placements: [{ row: 0, col: 0 }, { row: 3, col: 0 }] });
      const plan = planResize([wine], 2, 2);
      expect(plan.updates).toEqual([{ wineId: 'a', placements: [{ row: 0, col: 0 }] }]);
      expect(plan.deletions).toEqual([]);
      expect(plan.removedBottles).toBe(1);
    });

    it('supprime la fiche si plus aucun placement ne subsiste', () => {
      const wine = makeWine({ id: 'b', placements: [{ row: 5, col: 5 }, { row: 6, col: 0 }] });
      const plan = planResize([wine], 2, 2);
      expect(plan.updates).toEqual([]);
      expect(plan.deletions).toEqual(['b']);
      expect(plan.removedBottles).toBe(2);
    });

    it('ignore les vins sans identifiant', () => {
      const wine = makeWine({ id: undefined, placements: [{ row: 9, col: 9 }] });
      expect(planResize([wine], 2, 2).removedBottles).toBe(0);
    });
  });
});
