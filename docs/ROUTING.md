# Routage et gardes

Le routage est déclaré dans des `NgModule` de routage avec **chargement différé** (`loadChildren`) et préchargement de tous les modules (`PreloadAllModules`) : l'écran de démarrage reste léger, les autres pages se chargent en arrière-plan.

## Carte des routes

| URL | Page | Garde | Remarque |
|---|---|---|---|
| `/` | Onglets (redirige vers `/home`) | `setupGuard` | Parent de toutes les pages de l'application |
| `/home` | `HomePage` — tableau de bord | via le parent | |
| `/cave` | `CavePage` — grille de la cave | via le parent | |
| `/catalogue` | Page d'accueil réutilisée en attendant le vrai catalogue | via le parent | **Uniquement si** `features.catalogue` est vrai |
| `/settings` | `SettingsPage` | via le parent | |
| `/settings/personal-information` | `PersonalInformationPage` | via le parent | |
| `/settings/favorite-wine` | `FavoriteWinePage` | via le parent | |
| `/settings/language` | `LanguagePage` | via le parent | |
| `/auth` | `AuthPage` — connexion / inscription | `guestGuard` | |
| `/preference` | `PreferencePage` — onboarding | `authGuard` | |
| `**` | — | — | Redirige vers `/` |

Les gardes sont posées **une seule fois sur le parent** (`/`, `/auth`, `/preference`) ; les routes enfants en héritent. (L'ancienne version répétait la garde sur chaque onglet.)

## Gardes (`guards/auth.guard.ts`)

Gardes **fonctionnelles** (`CanActivateFn`). Toutes attendent d'abord `AuthService.waitUntilReady()`, pour ne pas décider avant que la session Firebase soit restaurée (sinon un utilisateur déjà connecté serait renvoyé vers `/auth` à chaque démarrage).

| Garde | Autorise | Sinon redirige vers |
|---|---|---|
| `authGuard` | Utilisateur connecté, onboarding terminé ou non | `/auth` |
| `setupGuard` | Utilisateur connecté **et** onboarding terminé | `/auth` (non connecté) ou `/preference` (onboarding à faire) |
| `guestGuard` | Visiteur non connecté | `/home` (connecté, onboarding terminé) ou `/preference` |

## Parcours types

- **Premier lancement** : `/` → `setupGuard` → `/auth` → inscription → `AuthService.register` → `/preference` → fin d'onboarding → `/home`.
- **Retour de l'utilisateur** : session restaurée → `/` → `/home`.
- **Compte créé mais onboarding abandonné** : toute navigation vers l'application renvoie vers `/preference`.
- **Déconnexion** : navigation vers `/auth` avec remplacement de l'historique (le bouton retour ne ramène pas dans l'application). Après une **suppression de compte**, la page navigue aussi vers `/auth`.

## Navigation par onglets

`TabsPage` gère aussi un **balayage horizontal** entre onglets (geste Ionic). L'ordre des onglets (`TAB_ORDER`) tient compte du drapeau `features.catalogue` : l'onglet Catalogue n'apparaît ni dans la barre ni dans l'ordre de balayage quand il est désactivé.
