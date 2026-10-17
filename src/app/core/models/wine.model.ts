import { WineType } from '../types/WineType';

export interface TranslatedText<T> {
  fr: T;
  en: T;
}

export interface BaseWine {
  name: string;
  domain: string;
  region: string;
  vintage: number;
  type: WineType;
  appellation?: string;
  grapeVariety?: string;
}

/** Vin du catalogue commun (fonctionnalité à venir). */
export interface WineCatalogue extends BaseWine {
  id: string;
  description: TranslatedText<string>;
  foodPairing: TranslatedText<string[]>;
}

/** Emplacement (0-indexé) d'une bouteille dans la grille de la cave. */
export interface CellPlacement {
  row: number;
  col: number;
}

/**
 * Vin appartenant à un utilisateur (`users/{uid}/wine/{wineId}`).
 * Une fiche regroupe toutes les bouteilles identiques : une bouteille = un placement.
 */
export interface UserWine extends BaseWine {
  id?: string;
  ownerId: string;
  wineCatalogueId?: string;
  isCustom: boolean;
  unitPrice: number;
  rating?: number;
  peakMaturityYear?: number;
  /** Date d'ajout (ISO 8601) ; sert à programmer l'alerte de maturité. Absente des anciennes fiches. */
  addedAt?: string;

  description: string;
  foodPairing: string[];

  placements: CellPlacement[];
}

/** Case de la grille de la cave, occupée ou non. */
export interface CaveSlot {
  row: number;
  col: number;
  wine: UserWine | null;
}
