# Architecture

## Vue d'ensemble

Vinum est une application **Angular 20 / Ionic 8** empaquetée pour Android avec **Capacitor 8**. Le serveur est entièrement géré par **Firebase** : *Authentication* (e-mail/mot de passe et Google) et *Firestore* (base NoSQL, avec persistance locale pour le fonctionnement hors ligne). Il n'y a aucun serveur applicatif à déployer.

```
┌────────────────────────── Appareil ─────────────────────────────┐
│  Ionic / Angular (WebView Capacitor)                            │
│   pages ──► services (Auth, Cave, Préférences, Toast)           │
│                 │            │                                  │
│                 │            └─► Capacitor Preferences          │
│                 │                (thème, langue, notifications) │
│                 ▼                                               │
│        SDK Firebase JS ◄─► cache Firestore persistant (IndexedDB)│
└─────────────────┬───────────────────────────────────────────────┘
                  ▼
        Firebase Auth + Firestore  (règles : firestore.rules)
```

## Arborescence

```
src/
├── main.ts                      Démarrage (bootstrapModule)
├── global.scss, theme/          Styles globaux et variables Ionic
├── environments/                Configuration Firebase + drapeaux de fonctionnalités
├── assets/                      Images, drapeaux, traductions (assets/i18n/*.json)
└── app/
    ├── app.module.ts            Providers globaux (HTTP, Firebase, Transloco, init des préférences)
    ├── app-routing.module.ts    Routes de premier niveau (lazy loading)
    ├── auth/                    Page connexion / inscription
    ├── preference/              Onboarding (identité, vin préféré, taille de la cave)
    ├── tabs/                    Navigation par onglets (Accueil, Ma cave, Catalogue*, Réglages)
    ├── home/                    Tableau de bord
    ├── cave/                    Grille de la cave, recherche, ajout de bouteille
    ├── settings/                Réglages + sous-pages (infos perso, vin préféré, langue)
    ├── guards/                  Gardes de route fonctionnelles
    ├── components/              Composants réutilisables (standalone)
    └── core/
        ├── models/              Interfaces de données (User, UserWine…)
        ├── types/               Constantes et types (WineType, ErrorsCode, LanguageConfig…)
        ├── utils/               Logique pure, sans Angular ni Firebase (testable seule)
        ├── forms/               Fabrique du formulaire de vin partagé
        ├── services/            Services applicatifs
        └── icons.ts             Icônes Ionicons embarquées
```

\* L'onglet Catalogue est masqué tant que `environment.features.catalogue` vaut `false` (voir [Développement](DEVELOPMENT.md#fonctionnalités-désactivées)).

## Principes structurants

### 1. La logique métier vit dans `core/utils`, pas dans les composants

Tout calcul qui ne dépend ni d'Angular ni de Firebase est un module TypeScript pur :

| Module | Responsabilité |
|---|---|
| `placement.util.ts` | Lettres de colonnes (A, B… AA), libellé « A1 », grille, emplacements libres, plan de redimensionnement |
| `cave-stats.util.ts` | Statistiques du tableau de bord (total, valeur, vin star, répartitions, note moyenne) |
| `wine.util.ts` | Normalisation d'un document Firestore, comparaison de vins, accords mets-vins |
| `user.util.ts` | Normalisation du profil, test « onboarding terminé » |
| `preferences.util.ts` | Validation des préférences lues sur l'appareil |
| `error.util.ts` | Conversion d'une erreur quelconque en clé de traduction |
| `search.util.ts` | Recherche multi-mots insensible aux accents et à la casse |

Ces modules sont couverts par des tests exécutables sans navigateur (voir [Tests](TESTING.md)). Les services et composants se contentent de les orchestrer.

### 2. Angular moderne, Ionic classique

- Composants et pages **standalone** ; `NgModule` conservés uniquement pour le démarrage et le *lazy loading* des pages (`*.module.ts` + `*-routing.module.ts`).
- Injection par `inject()`, nettoyage des abonnements par `takeUntilDestroyed`, gardes **fonctionnelles**, `provideAppInitializer` pour charger les préférences avant le premier affichage.
- Ionic est utilisé via `IonicModule` (composants non standalone) ; la migration vers `@ionic/angular/standalone` est une évolution possible mais hors périmètre (voir [Revue](REVIEW.md#améliorations-recommandées-non-réalisées)).
- Détection de changements : `OnPush` sur les composants les plus nombreux ou les plus sollicités (`CellarCellComponent`, répété pour chaque case de la grille, et `StepperComponent`) ; les pages s'appuient sur le `async` pipe et les signaux. Généraliser `OnPush` est possible composant par composant.

### 3. Firestore est la source de vérité, le temps réel fait le reste

`CaveService` s'abonne (`collectionData`) à `users/{uid}/wine` dès qu'un utilisateur est connecté. Toute écriture (ajout, retrait, notation, redimensionnement) modifie Firestore ; l'interface se met à jour via l'écouteur, y compris hors ligne grâce au cache local. Il n'y a donc **pas de copie à synchroniser à la main** dans les services.

### 4. Hors ligne

Le cache persistant de Firestore (`persistentLocalCache`) rend l'application utilisable sans réseau. Une subtilité : hors ligne, une écriture Firestore ne se résout qu'à la reconnexion ; `CaveService.settle()` n'attend donc pas la confirmation serveur quand `navigator.onLine === false`, sinon l'interface resterait bloquée sur « enregistrement… ».

### 5. Erreurs : des clés, jamais du texte

Les services lèvent des erreurs brutes (ou `AppError` portant une clé). Seule la couche d'interface les traduit, via `toErrorKey(error)` puis `TranslocoService.translate`. Aucun texte utilisateur n'est écrit en dur dans le code TypeScript ou les gabarits.

## Démarrage de l'application

1. `main.ts` démarre `AppModule`.
2. `provideAppInitializer` exécute `PreferencesService.init()` : lecture du thème/langue/notifications, chargement de la traduction **avant** activation, classe `dark` sur `<body>`, attribut `lang` du document.
3. `AppComponent` enregistre les icônes (`registerIcons()`).
4. `AuthService` restaure la session Firebase ; les gardes attendent `waitUntilReady()` avant de décider de la route.
5. `CaveService` démarre l'écouteur Firestore dès qu'un utilisateur est présent et l'arrête à la déconnexion.

## Dépendances externes notables

| Paquet | Usage |
|---|---|
| `@angular/fire`, `firebase` | Auth, Firestore |
| `@capacitor-firebase/authentication` | Connexion Google native (récupération de l'`idToken`) |
| `@capacitor/preferences` | Stockage local des préférences |
| `@capacitor/status-bar` | Couleur des icônes de la barre d'état selon le thème |
| `@jsverse/transloco` + `-messageformat` | Traductions et pluriels ICU |
| `ionicons` | Icônes (enregistrées une à une, voir `core/icons.ts`) |

Les plugins Capacitor `app`, `haptics` et `keyboard` sont déclarés dans `package.json` mais **ne sont pas utilisés par le code** : voir la [Revue](REVIEW.md#améliorations-recommandées-non-réalisées).
