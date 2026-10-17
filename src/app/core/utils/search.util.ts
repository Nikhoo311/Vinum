/**
 * Élément recherchable, indépendant du type de contenu (vins, accords mets-vins…).
 * Chaque écran fournit sa propre fonction d'adaptation vers cette forme minimale.
 */
export interface SearchableItem {
  id: string;
  label: string;
  subtitle?: string;
  tag?: string;
  keywords: (string | undefined)[];
  placementCount?: number;
}

/** Minuscules, sans accents ni espaces superflus : « Château » → « chateau ». */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Retourne les éléments contenant **tous** les mots de la recherche
 * (insensible à la casse et aux accents). Une recherche vide ne retourne rien.
 */
export function searchItems(items: readonly SearchableItem[], query: string): SearchableItem[] {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return items.filter((item) => {
    const haystack = normalizeSearchText(
      [item.label, item.subtitle, item.tag, ...item.keywords].filter(Boolean).join(' ')
    );
    return terms.every((term) => haystack.includes(term));
  });
}
