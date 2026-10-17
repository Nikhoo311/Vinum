import { CaveSlot, CellPlacement, UserWine } from '../models/wine.model';

/**
 * Convertit un index de ligne (0-indexé) en libellé façon tableur :
 * 0 → A, 25 → Z, 26 → AA, 27 → AB…
 * Retourne une chaîne vide pour une valeur invalide.
 */
export function columnLetters(index: number): string {
  let n = Math.floor(index);
  if (!Number.isFinite(n) || n < 0) return '';

  let result = '';
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return result;
}

/** Libellé lisible d'un emplacement : `{ row: 0, col: 2 }` → `A3`. */
export function formatPlacement(placement: CellPlacement | null | undefined): string {
  if (!placement) return '';
  return `${columnLetters(placement.row)}${placement.col + 1}`;
}

/** Clé unique d'un emplacement, utilisable dans un `Map` ou un `Set`. */
export function placementKey(placement: CellPlacement): string {
  return `${placement.row}-${placement.col}`;
}

/** Comparateur d'emplacements : ligne puis colonne. */
export function comparePlacements(a: CellPlacement, b: CellPlacement): number {
  return a.row - b.row || a.col - b.col;
}

/** Indique si un emplacement tient dans une cave de `rows` × `cols`. */
export function isWithinBounds(placement: CellPlacement, rows: number, cols: number): boolean {
  return placement.row >= 0 && placement.row < rows && placement.col >= 0 && placement.col < cols;
}

/**
 * Construit la grille complète de la cave (ligne par ligne) en associant
 * à chaque case le vin qui l'occupe, ou `null` si elle est vide.
 */
export function buildGrid(rows: number, cols: number, wines: readonly UserWine[]): CaveSlot[] {
  if (!(rows > 0) || !(cols > 0)) return [];

  const occupants = new Map<string, UserWine>();
  for (const wine of wines) {
    for (const placement of wine.placements ?? []) {
      occupants.set(placementKey(placement), wine);
    }
  }

  const slots: CaveSlot[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      slots.push({ row, col, wine: occupants.get(`${row}-${col}`) ?? null });
    }
  }
  return slots;
}

/**
 * Cherche `quantity` emplacements libres en partant de `start` puis en
 * parcourant la cave de façon circulaire. Retourne moins d'emplacements que
 * demandé si la cave est trop pleine.
 */
export function findFreePlacements(
  rows: number,
  cols: number,
  wines: readonly UserWine[],
  start: CellPlacement | null,
  quantity: number
): CellPlacement[] {
  const total = Math.max(0, Math.floor(rows)) * Math.max(0, Math.floor(cols));
  if (total === 0 || !(quantity > 0)) return [];

  const occupied = new Set<string>();
  for (const wine of wines) {
    for (const placement of wine.placements ?? []) {
      occupied.add(placementKey(placement));
    }
  }

  const startIndex = start && isWithinBounds(start, rows, cols) ? start.row * cols + start.col : 0;
  const result: CellPlacement[] = [];

  for (let offset = 0; offset < total && result.length < quantity; offset++) {
    const index = (startIndex + offset) % total;
    const placement = { row: Math.floor(index / cols), col: index % cols };
    if (!occupied.has(placementKey(placement))) {
      result.push(placement);
    }
  }

  return result;
}

/** Modification à appliquer à un vin lors d'un redimensionnement de la cave. */
export interface WinePlacementsUpdate {
  wineId: string;
  placements: CellPlacement[];
}

/** Effet d'un redimensionnement de la cave sur les vins existants. */
export interface ResizePlan {
  /** Vins dont certains placements sortent de la nouvelle grille mais qui en gardent au moins un. */
  updates: WinePlacementsUpdate[];
  /** Vins dont tous les placements sortent de la nouvelle grille (fiche à supprimer). */
  deletions: string[];
  /** Nombre de bouteilles qui n'auront plus d'emplacement. */
  removedBottles: number;
}

/**
 * Calcule ce qu'implique un redimensionnement de la cave, sans rien modifier.
 * Permet de prévenir l'utilisateur avant toute suppression.
 */
export function planResize(wines: readonly UserWine[], rows: number, cols: number): ResizePlan {
  const plan: ResizePlan = { updates: [], deletions: [], removedBottles: 0 };

  for (const wine of wines) {
    if (!wine.id) continue;

    const placements = wine.placements ?? [];
    const kept = placements.filter((placement) => isWithinBounds(placement, rows, cols));
    if (kept.length === placements.length) continue;

    plan.removedBottles += placements.length - kept.length;
    if (kept.length === 0) {
      plan.deletions.push(wine.id);
    } else {
      plan.updates.push({ wineId: wine.id, placements: kept });
    }
  }

  return plan;
}
