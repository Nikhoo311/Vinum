# Vinum

Application mobile de gestion de cave à vin : on dessine sa cave (rangées × colonnes), on y range ses bouteilles, on les note, et le tableau de bord donne l'état du stock (valeur, répartition par type et par région, taux de remplissage, note moyenne).

| | |
|---|---|
| **Stack** | Ionic 8 · Angular 20 · Capacitor 8 · Firebase (Auth + Firestore) · Transloco |
| **Plateforme** | Android (Capacitor) et navigateur |
| **Identifiant** | `fr.nikho.vinum` |
| **Langues** | français (référence), anglais, espagnol, italien |
| **Projet Firebase** | `remember-me-e9313` |

## Démarrage rapide

Prérequis : Node.js 20.19+ ou 22 (requis par Angular 20), npm 10+.

```bash
npm ci            # installation reproductible (utilise package-lock.json)
npm start         # serveur de développement → http://localhost:4200
```

## Commandes

| Commande | Rôle |
|---|---|
| `npm start` | Serveur de développement (configuration `development`) |
| `npm run build:prod` | Build de production dans `www/` |
| `npm run lint` | ESLint (TypeScript + gabarits) |
| `npm test` | Tests unitaires Karma en mode watch |
| `npm run test:ci` | Tests unitaires, Chrome sans interface, une seule passe |
| `npm run check:i18n` | Même jeu de clés et de variables dans les 4 langues, aucune clé inconnue dans le code |
| `npm run check:icons` | Toute icône utilisée est enregistrée dans `core/icons.ts` |
| `npm run check` | Les quatre contrôles ci-dessus à la suite (ce que fait la CI) |
| `npm run android:sync` | Build de production puis `cap sync android` |

## Documentation

La documentation est découpée par sujet dans [`docs/`](docs/README.md) :

| Document | Contenu |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | Structure du code, couches, flux de données, choix techniques |
| [Services](docs/SERVICES.md) | API de `AuthService`, `CaveService`, `PreferencesService`, `ToastService` |
| [Modèle de données](docs/DATA-MODEL.md) | Modèles TypeScript, structure Firestore, règles métier |
| [Composants et pages](docs/COMPONENTS.md) | Entrées/sorties de chaque composant, rôle de chaque page |
| [Routage et gardes](docs/ROUTING.md) | Carte des routes, comportement des gardes |
| [Internationalisation](docs/I18N.md) | Ajouter une langue ou une clé, conventions, contrôles |
| [Sécurité et Firebase](docs/SECURITY.md) | Règles Firestore, secrets, durcissement, limites connues |
| [Android et publication](docs/ANDROID-RELEASE.md) | Signature, build, mise en production |
| [Développement](docs/DEVELOPMENT.md) | Environnement, conventions de code, fonctionnalités désactivées |
| [Tests](docs/TESTING.md) | Stratégie, ce qui est couvert, comment écrire un test |
| [Revue de code](docs/REVIEW.md) | Constat détaillé de la revue, corrections, points restants |
| [Journal des changements](docs/CHANGELOG.md) | Ce qui a changé par rapport à la version précédente |

## Licence

Projet privé et confidentiel.
