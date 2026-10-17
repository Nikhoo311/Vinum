import { UserWine } from '../models/wine.model';

/** Fabrique un vin de test complet, surchargeable champ par champ. */
export function makeWine(overrides: Partial<UserWine> = {}): UserWine {
  return {
    id: 'wine-1',
    ownerId: 'user-1',
    isCustom: true,
    name: 'Château Test',
    domain: 'Domaine Test',
    region: 'Bordeaux',
    vintage: 2018,
    type: 'red',
    unitPrice: 20,
    description: '',
    foodPairing: [],
    placements: [{ row: 0, col: 0 }],
    ...overrides,
  };
}
