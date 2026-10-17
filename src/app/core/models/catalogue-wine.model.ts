import { WineType } from '../types/WineType';

export interface CatalogueWine {
  id: string;
  name: string;
  domain: string;
  region: string;
  vintage: number | string;
  type: WineType;
  grapeVariety: string;
  unitPrice: number;
  inCave?: boolean;
  description?: string;
  foodPairing?: string[];
  rating?: number;
  peakMaturityYear?: number;
}

export type CatalogueWineData = Omit<CatalogueWine, 'id' | 'inCave'>;
export type CatalogueSort = 'name' | 'price-asc' | 'price-desc' | 'vintage-desc';
