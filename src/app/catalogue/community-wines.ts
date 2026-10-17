import { CatalogueWine } from '../core/models/catalogue-wine.model';
import { WineType } from '../core/types/WineType';

/**
 * Vins du catalogue commun.
 * Liste embarquée en attendant un catalogue serveur : les identifiants sont stables
 * car ils sont enregistrés dans `wineCatalogueId` des fiches mises en cave.
 */
export const COMMUNITY_WINES: readonly CatalogueWine[] = [
  { id: 'lacave', name: 'Château Lacave', domain: 'Château Lacave', region: 'Bordeaux', vintage: 2018, type: WineType.RED, grapeVariety: 'Merlot, Cabernet Sauvignon', unitPrice: 28 },
  { id: 'sancerre', name: 'Sancerre Blanc', domain: 'Domaine Vacheron', region: 'Loire', vintage: 2021, type: WineType.WHITE, grapeVariety: 'Sauvignon Blanc', unitPrice: 18 },
  { id: 'tavel', name: 'Tavel Rosé', domain: 'Domaine de la Mordorée', region: 'Rhône', vintage: 2022, type: WineType.ROSE, grapeVariety: 'Grenache, Cinsault, Syrah', unitPrice: 15 },
  { id: 'champagne', name: 'Champagne Brut Réserve', domain: 'Maison Charles', region: 'Champagne', vintage: 'NV', type: WineType.CHAMPAGNE, grapeVariety: 'Chardonnay, Pinot Noir', unitPrice: 32 },
  { id: 'bourgogne', name: 'Bourgogne Pinot Noir', domain: 'Domaine des Cèdres', region: 'Bourgogne', vintage: 2019, type: WineType.RED, grapeVariety: 'Pinot Noir', unitPrice: 24 },
  { id: 'cahors', name: 'Cahors Malbec', domain: 'Clos des Vignes', region: 'Sud-Ouest', vintage: 2017, type: WineType.RED, grapeVariety: 'Malbec', unitPrice: 16 },
  { id: 'roussette', name: 'Roussette de Savoie', domain: 'Domaine de la Pierre', region: 'Savoie', vintage: 2022, type: WineType.WHITE, grapeVariety: 'Altesse', unitPrice: 14 },
  { id: 'provence', name: 'Côtes de Provence Rosé', domain: 'Domaine des Pins', region: 'Provence', vintage: 2023, type: WineType.ROSE, grapeVariety: 'Grenache, Cinsault', unitPrice: 11 },
  { id: 'rhone', name: 'Côtes du Rhône', domain: 'Domaine Saint-Roch', region: 'Rhône', vintage: 2020, type: WineType.RED, grapeVariety: 'Grenache, Syrah', unitPrice: 12 },
  { id: 'cremant', name: 'Crémant de Bourgogne', domain: 'Maison Delaunay', region: 'Bourgogne', vintage: 'NV', type: WineType.CHAMPAGNE, grapeVariety: 'Pinot Noir, Chardonnay', unitPrice: 15 },
  { id: 'chablis', name: 'Chablis Premier Cru', domain: 'Domaine Laroche', region: 'Bourgogne', vintage: 2021, type: WineType.WHITE, grapeVariety: 'Chardonnay', unitPrice: 26 },
  { id: 'gigondas', name: 'Gigondas', domain: 'Domaine des Dentelles', region: 'Rhône', vintage: 2020, type: WineType.RED, grapeVariety: 'Grenache, Syrah', unitPrice: 21 },
];
