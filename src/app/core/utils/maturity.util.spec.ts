import { maturityDate, notificationIdFor, planMaturityNotifications } from './maturity.util';
import { makeWine } from './testing.fixtures';

describe('maturity.util', () => {
  it("place l'alerte au même jour et mois que l'ajout, dans l'année d'apogée", () => {
    const date = maturityDate(new Date(2026, 9, 3, 18, 30).toISOString(), 2028);
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2028, 9, 3, 10]);
  });

  it("retombe sur le 1er janvier sans date d'ajout valide", () => {
    for (const added of [undefined, 'pas une date']) {
      const date = maturityDate(added, 2030);
      expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2030, 0, 1]);
    }
  });

  it('ramène un ajout au 29 février au 28 février les années non bissextiles', () => {
    const date = maturityDate(new Date(2024, 1, 29, 12).toISOString(), 2027);
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2027, 1, 28]);
  });

  it('produit un identifiant stable, positif et non nul', () => {
    expect(notificationIdFor('abc')).toBe(notificationIdFor('abc'));
    expect(notificationIdFor('abc')).not.toBe(notificationIdFor('abd'));
    for (const id of ['', 'a', 'zzzzzzzzzzzzzzzzzzzzzzzz']) {
      expect(notificationIdFor(id)).toBeGreaterThan(0);
    }
  });

  it('ne programme que les vins en cave, avec apogée future, du plus proche au plus lointain', () => {
    const now = new Date(2026, 9, 17);
    const placed = [{ row: 0, col: 0 }];
    const wines = [
      makeWine({ id: 'late', peakMaturityYear: 2035, addedAt: new Date(2026, 0, 5).toISOString(), placements: placed }),
      makeWine({ id: 'soon', peakMaturityYear: 2027, addedAt: new Date(2026, 5, 1).toISOString(), placements: placed }),
      makeWine({ id: 'past', peakMaturityYear: 2020, placements: placed }),
      makeWine({ id: 'empty', peakMaturityYear: 2040, placements: [] }),
      makeWine({ id: 'none', placements: placed }),
    ];

    expect(planMaturityNotifications(wines, now).map((n) => n.wineId)).toEqual(['soon', 'late']);
  });
});
