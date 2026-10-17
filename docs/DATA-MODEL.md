# Modèle de données

## Modèles TypeScript

Définis dans `src/app/core/models/` et `src/app/core/types/`.

### `User` — profil (`models/user.model.ts`)

```ts
interface User {
  id: string;                         // uid Firebase Auth
  email: string;
  firstName: string;
  lastName: string;
  favoriteWineType: WineType | null;
  provider: 'google' | 'password';
  createdAt: string;                  // ISO 8601 (ex. "2026-10-17T08:30:00.000Z")
  caveConfig: CaveConfig;
}

interface CaveConfig {
  rows: number;                       // 0 tant que l'onboarding n'est pas terminé
  cols: number;
  viewMode: 'grid' | 'list';
}
```

> **Changement par rapport à l'ancienne documentation** : `createdAt` est une chaîne ISO, pas un `Date` ni un `Timestamp`. `normalizeUser` convertit à la lecture les anciens documents (Timestamp Firestore, `Date`, nombre) vers ce format.

L'**onboarding est terminé** (`hasCompletedSetup`) lorsque `caveConfig.rows` et `caveConfig.cols` sont tous deux supérieurs à 0. C'est ce critère, et lui seul, qu'utilisent les gardes de route.

### `UserWine` — fiche de vin (`models/wine.model.ts`)

```ts
interface UserWine {
  id?: string;                // identifiant du document Firestore (absent avant l'écriture)
  ownerId: string;            // uid du propriétaire
  wineCatalogueId?: string;   // réservé au futur catalogue commun
  isCustom: boolean;          // true : saisi par l'utilisateur
  name: string;
  domain: string;
  region: string;
  vintage: number;            // millésime
  type: WineType;
  appellation?: string;
  grapeVariety?: string;
  unitPrice: number;          // prix d'achat unitaire, en euros
  rating?: number;            // 0 à 5, par pas de 0,5
  peakMaturityYear?: number;  // année d'apogée, postérieure au millésime
  addedAt?: string;           // date d'ajout (ISO 8601) ; absente des anciennes fiches
  description: string;        // notes de dégustation
  foodPairing: string[];      // accords mets-vins
  placements: CellPlacement[];
}

interface CellPlacement { row: number; col: number }   // 0-indexés
interface CaveSlot      { row: number; col: number; wine: UserWine | null }
```

**Une fiche = un vin ; une bouteille = un emplacement.** Trois bouteilles du même vin sont une seule fiche avec trois `placements`. La quantité d'un vin est donc `placements.length`, il n'existe pas de champ « quantité » stocké.

### Types et constantes (`types/`)

| Élément | Valeur |
|---|---|
| `WineType` | `'red'`, `'white'`, `'rose'`, `'champagne'` |
| `WINE_TYPES` | Les quatre types, dans l'ordre d'affichage des statistiques |
| `WINE_TYPE_CONFIG` | Pour chaque type : icône (bouteille SVG), clé de traduction du libellé, dégradé |
| `CAVE_MAX` | `24` — emplacements maximum à l'onboarding et dans les réglages (version gratuite) |
| `CAVE_MAX_PREMIUM` | `240` — plafond technique (règles Firestore, `resizeCave`) ; ancien nom : `CAVE_MAX_PRENIUM` |
| `AuthTypeEnum` | `LOGIN`, `REGISTER` |
| `DarkModeSetting` | `'light'`, `'dark'`, `'system'` |
| `ERRORS_CODES` | Codes d'erreur Firebase Auth utilisés par `toErrorKey` |
| `LANGUAGE_CONFIG` | Code, drapeau, nom natif et nom anglais de chaque langue |

## Structure Firestore

```
users/{uid}                          ← profil (User)
  email, firstName, lastName, favoriteWineType, provider, createdAt,
  caveConfig: { rows, cols, viewMode }

users/{uid}/wine/{wineId}            ← une fiche par vin (UserWine, sans `id` redondant)
  ownerId, isCustom, name, domain, region, vintage, type,
  unitPrice, description, foodPairing[], placements[{row, col}],
  [appellation], [grapeVariety], [rating], [peakMaturityYear], [addedAt], [wineCatalogueId]
```

Les champs entre crochets sont **facultatifs** et réellement absents du document quand ils n'ont pas de valeur (jamais `null` ni chaîne vide) : `updateWine` les supprime avec `deleteField()`.

Aucun index composite n'est nécessaire (`firestore.indexes.json` est vide) : le code lit la sous-collection entière et trie côté client.

## Règles métier

| Règle | Où elle est appliquée |
|---|---|
| Une case contient au plus une bouteille | `findFreePlacements` à l'ajout (côté client, voir [limite connue](SERVICES.md#limite-connue)) |
| Le même vin (nom, domaine, millésime, appellation, type) n'a qu'une fiche | `isSameWine` dans `CaveService.addWine` |
| Retirer la dernière bouteille supprime la fiche | `CaveService.removeBottle` |
| Redimensionner retire les bouteilles hors de la nouvelle grille, après confirmation | `planResize` → `previewResize` → alerte → `resizeCave` (lot atomique) |
| 1 ≤ rangées, colonnes ; rangées × colonnes ≤ 24 dans l'interface, ≤ 240 côté service et règles | `settings.page`, `preference.page`, `resizeCave`, `firestore.rules` |
| Note : 0 à 5 par demi-points | `halfStepRating` (formulaire), `firestore.rules` |
| Année d'apogée > millésime | `peakMaturityYearAfterVintage` (formulaire) |
| Rangées nommées A, B… Z, AA, AB…, colonnes numérotées à partir de 1 | `formatPlacement` : `{ row: 0, col: 2 }` → « A3 ». (La fonction `columnLetters` convertit en réalité un index de **rangée** ; son nom est historique) |

## Statistiques du tableau de bord

Calculées en un seul passage par `computeCaveStats` :

| Statistique | Définition |
|---|---|
| Bouteilles | Somme des `placements.length` |
| Valeur de la cave | Σ `unitPrice` × bouteilles (prix d'achat, pas une estimation de marché) |
| Vin star | Fiche au `unitPrice` le plus élevé (strictement positif) |
| Régions distinctes | Régions non vides, comparées après `trim` |
| Note moyenne | Moyenne des `rating` des fiches notées, arrondie au dixième ; 0 si aucune |
| Répartition par type | Bouteilles par `WineType` |
| Répartition par région | Bouteilles par région, triées par effectif décroissant puis par nom. Les orthographes proches (« Rhône », « rhone », « Rhône »…, tirets et espaces multiples) sont **regroupées** ; le nom affiché est l'orthographe la plus utilisée |
| Taux de remplissage | `fillPercentage(bouteilles, rangées × colonnes)` |

## Compatibilité avec les anciennes données

`normalizeUser` et `normalizeWine` acceptent des documents anciens ou incomplets sans lever d'erreur :

- champs manquants → valeurs par défaut (`''`, `0`, `[]`) ;
- `createdAt` sous forme de Timestamp/`Date` → chaîne ISO ;
- dimensions de cave invalides → valeurs par défaut ;
- `foodPairing` ou `placements` mal formés → éléments invalides ignorés ;
- fiche sans `name` ou avec un `type` inconnu → ignorée (non affichée).
