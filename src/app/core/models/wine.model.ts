import { WineType } from "../types/WineType";

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

export interface WineCatalogue extends BaseWine {
  id: string;
  description: TranslatedText<string>;
  foodPairing: TranslatedText<string[]>;
}

export interface CellPlacement {
  row: number;
  col: number;
}

export interface UserWine extends BaseWine {
  id?: string;
  ownerId: string;
  wineCatalogueId?: string;
  isCustom: boolean;
  unitPrice: number;
  rating?: number;
  peakMaturityYear?: number;
  
  description: string;     
  foodPairing: string[];   

  placements: CellPlacement[];
}