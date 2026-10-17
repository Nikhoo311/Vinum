import { WineType } from '../types/WineType';

/**
 * Vin du catalogue (commun ou personnel).
 * Le millésime peut valoir `'NV'` (sans millésime) pour les vins non millésimés.
 */
export interface CatalogueWine {
  id: string;
  name: string;
  domain: string;
  region: string;
  vintage: number | string;
  type: WineType;
  grapeVariety: string;
  unitPrice: number;
  description?: string;
  foodPairing?: string[];
  rating?: number;
  peakMaturityYear?: number;
  /** Calculé à l'affichage : au moins une bouteille de ce vin est en cave. */
  inCave?: boolean;
}

/** Contenu d'une fiche telle qu'elle est enregistrée (sans identifiant ni état calculé). */
export type CatalogueWineData = Omit<CatalogueWine, 'id' | 'inCave'>;

export type CatalogueSort = 'name' | 'price-asc' | 'price-desc' | 'vintage-desc';

/** Filtre de statut : tous les vins, ceux de la liste de souhaits, ou ceux déjà en cave. */
export type CatalogueStatus = 'all' | 'wishlist' | 'cellar';

/** Catalogue consulté : vins communs ou fiches personnelles de l'utilisateur. */
export type CatalogueScope = 'community' | 'personal';
