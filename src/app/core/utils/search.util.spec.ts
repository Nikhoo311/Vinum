import { SearchableItem, normalizeSearchText, searchItems } from './search.util';

const ITEMS: SearchableItem[] = [
  { id: '1', label: 'Château Margaux', subtitle: 'Domaine A · 2015', tag: 'A1, A2', keywords: ['Bordeaux', 'Merlot'] },
  { id: '2', label: 'Chablis', subtitle: 'Domaine B · 2018', tag: 'B1', keywords: ['Bourgogne', undefined, 'Chardonnay'] },
  { id: '3', label: 'Pauillac', subtitle: 'Domaine C · 2018', tag: 'C3', keywords: ['Bordeaux'] },
];

describe('search.util', () => {
  it('normalise accents, casse et espaces', () => {
    expect(normalizeSearchText('  CHÂTEAU  Éclair ')).toBe('chateau  eclair');
  });

  it('ne retourne rien pour une recherche vide', () => {
    expect(searchItems(ITEMS, '')).toEqual([]);
    expect(searchItems(ITEMS, '   ')).toEqual([]);
  });

  it('ignore la casse et les accents', () => {
    expect(searchItems(ITEMS, 'CHATEAU').map((item) => item.id)).toEqual(['1']);
  });

  it('exige tous les mots de la recherche', () => {
    expect(searchItems(ITEMS, 'bordeaux 2018').map((item) => item.id)).toEqual(['3']);
    expect(searchItems(ITEMS, 'bordeaux chardonnay')).toEqual([]);
  });

  it('cherche aussi dans le libellé des emplacements', () => {
    expect(searchItems(ITEMS, 'b1').map((item) => item.id)).toEqual(['2']);
  });

  it('retourne plusieurs résultats quand le terme est partagé', () => {
    expect(searchItems(ITEMS, 'bordeaux').map((item) => item.id)).toEqual(['1', '3']);
  });
});
