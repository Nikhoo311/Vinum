export const WineType = {
  WHITE: 'white',
  RED: 'red',
  ROSE: 'rose',
  CHAMPAGNE: 'champagne',
} as const;

export type WineType = (typeof WineType)[keyof typeof WineType];

/** Liste ordonnée des types de vin (ordre d'affichage des statistiques). */
export const WINE_TYPES: readonly WineType[] = [
  WineType.RED,
  WineType.WHITE,
  WineType.ROSE,
  WineType.CHAMPAGNE,
];

/** Garde de type : vérifie qu'une valeur inconnue est bien un type de vin. */
export function isWineType(value: unknown): value is WineType {
  return typeof value === 'string' && (WINE_TYPES as readonly string[]).includes(value);
}

type GradientColor = 'base' | 'accent';

export interface WineTypeConfig {
  icon: string;
  label: string;
  gradientColor: GradientColor;
  defaultFoodPairing: readonly string[];
}

export const WINE_TYPE_CONFIG: Record<WineType, WineTypeConfig> = {
  [WineType.RED]: {
    icon: 'assets/bottle_red.svg',
    label: 'WINE.TYPE.RED',
    gradientColor: 'accent',
    defaultFoodPairing: [
      'WINE.FOOD_PAIRINGS.RED.RED_MEAT',
      'WINE.FOOD_PAIRINGS.RED.SAUCE_DISHES',
      'WINE.FOOD_PAIRINGS.RED.AGED_CHEESES',
    ],
  },
  [WineType.WHITE]: {
    icon: 'assets/bottle_white.svg',
    label: 'WINE.TYPE.WHITE',
    gradientColor: 'accent',
    defaultFoodPairing: [
      'WINE.FOOD_PAIRINGS.WHITE.FISH_AND_SEAFOOD',
      'WINE.FOOD_PAIRINGS.WHITE.CREAMY_POULTRY',
      'WINE.FOOD_PAIRINGS.WHITE.GOAT_CHEESE',
    ],
  },
  [WineType.ROSE]: {
    icon: 'assets/bottle_rose.svg',
    label: 'WINE.TYPE.ROSE',
    gradientColor: 'accent',
    defaultFoodPairing: [
      'WINE.FOOD_PAIRINGS.ROSE.APERITIF_AND_TAPAS',
      'WINE.FOOD_PAIRINGS.ROSE.SALADS_AND_RAW_VEGETABLES',
      'WINE.FOOD_PAIRINGS.ROSE.GRILLED_DISHES',
    ],
  },
  [WineType.CHAMPAGNE]: {
    icon: 'assets/bottle_champagne.svg',
    label: 'WINE.TYPE.CHAMPAGNE',
    gradientColor: 'base',
    defaultFoodPairing: [
      'WINE.FOOD_PAIRINGS.CHAMPAGNE.APERITIF',
      'WINE.FOOD_PAIRINGS.CHAMPAGNE.SEAFOOD',
      'WINE.FOOD_PAIRINGS.CHAMPAGNE.SUSHI',
    ],
  },
};

/** Nombre maximum d'emplacements (offre gratuite). */
export const CAVE_MAX = 24;

/**
 * Nombre maximum d'emplacements (offre premium, non activée).
 * Cette valeur est aussi le plafond appliqué par les règles Firestore.
 */
export const CAVE_MAX_PREMIUM = 240;
