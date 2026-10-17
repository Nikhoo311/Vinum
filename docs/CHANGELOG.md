# Journal des changements

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Les détails et la justification de chaque point sont dans la [revue de code](REVIEW.md).

## [Non publié]

### Ajouté

- **Alertes de maturité** : notification locale le jour d'ajout d'un vin, dans son année d'apogée (`MaturityNotificationService`, `maturity.util`). Nouveau champ `addedAt` sur les fiches. Nécessite `npm install @capacitor/local-notifications` puis `npx cap sync android`.

### Modifié

- **Accueil** : la répartition par région regroupe les orthographes proches (casse, accents, tirets, espaces).
- **Police** : Quicksand partout (`--ion-font-family`), en remplacement de Nunito Sans / Inter.

## [1.0.0] — Revue de mise en production

### Ajouté

- **Traductions** anglaise, espagnole et italienne complètes (fichiers auparavant vides), clés de repli français, `check:i18n`.
- **Règles de sécurité Firestore** (`firestore.rules`), `firestore.indexes.json`, `.firebaserc`, `firebase.json`.
- **Redimensionnement sûr de la cave** : `previewResize` (simulation), alerte de confirmation, `resizeCave` (lot atomique).
- Modules de **logique pure** testés (`core/utils/*`) : placements, statistiques, vins, profil, préférences, erreurs, recherche — 65 tests.
- `core/forms/wine-form.ts` : formulaire de vin unique pour l'ajout et la modification.
- `core/icons.ts` : enregistrement explicite des icônes ; script `check:icons`.
- Gardes fonctionnelles `authGuard`, `setupGuard`, `guestGuard` (+ test).
- **Drapeaux de fonctionnalités** `environment.features` (`catalogue`, `maturityAlerts`).
- Signature Android de release (`keystore.properties`), `keystore.properties.example`.
- CI GitHub Actions (`.github/workflows/ci.yml`) ; scripts `build:prod`, `test:ci`, `check:i18n`, `check:icons`, `check`, `android:sync` ; lanceur Karma `ChromeHeadlessCI`.
- `.gitattributes` (fins de ligne LF).
- Documentation découpée en 12 documents thématiques et un index (`docs/`) ; README racine réduit à l'essentiel.
- Accessibilité : noms accessibles des boutons-icônes, `alt=""`/`aria-hidden` sur le décoratif, attribut `lang` dynamique.

### Modifié

- **Services** : `inject()`, erreurs brutes (traduites par l'interface), `AuthService` tolérant au hors-ligne, `CaveService` basé sur des observables et des statistiques mémorisées, `PreferencesService` validant les valeurs lues et chargeant la langue avant de l'activer, `ToastService` remplaçant le toast précédent.
- `AuthService.logout` / `deleteAccount` ferment aussi la session native Google ; `skipNativeAuth: true`.
- `User.createdAt` est une **chaîne ISO 8601** (conversion automatique des anciens documents).
- **Recherche** : ET logique entre les mots ; la barre de recherche émet `queryChange` (après 300 ms) et la page filtre.
- **Pages** : double envoi impossible, toasts d'erreur traduits, valeurs lues dans le profil plutôt que dans `history.state`, `FormGroup` typés, imports relatifs.
- **Routage** : gardes posées sur le parent ; route `**` redirigeant vers l'accueil ; onglet Catalogue conditionnel.
- **Android** : `allowBackup="false"`, `versionName` `1.0.0`, test instrumenté sur le bon identifiant d'application.
- **Build** : `lib: es2022`, options explicites en production (`optimization`, `aot`, `extractLicenses`), plus de copie des SVG d'Ionicons.
- Métadonnées : titre « Vinum », `lang="fr"`, `ionic.config.json` (`vinum`), `package.json` (version 1.0.0, description).
- Français : vouvoiement uniforme, corrections de formulation ; `TABS.STATS` → `TABS.CATALOGUE`.
- `CAVE_MAX_PRENIUM` → `CAVE_MAX_PREMIUM` ; `WinesRadioGroup` → `WinesRadioGroupComponent` ; sélecteur `app-form-error`.

### Corrigé

- Pertes de données possibles lors d'un redimensionnement interrompu (opération désormais atomique).
- Plantage de la page de réglages si la langue stockée est inconnue.
- Erreur de chargement des traductions anglaise, espagnole et italienne.
- Interface bloquée hors ligne après une écriture Firestore.
- Champs facultatifs d'un vin impossibles à supprimer ; écrasement possible de `placements` à la modification.
- Prénom / nom composés d'espaces acceptés à l'onboarding.
- Fautes dans les textes (« Veuillez vous reconnecté », « type vin préféré »), texte français en dur dans une page.
- Comparaisons `==` / `!=` dans les gabarits (règle ESLint `eqeqeq`).

### Supprimé

- 22 fichiers `*.spec.ts` générés qui échouaient (contenu « should create » sans fournisseurs).
- `guards/auth-guard.ts`, `guards/gest-guard.ts` et leurs tests (remplacés par `guards/auth.guard.ts`).
- Copie de tous les SVG d'Ionicons dans le build ; `console.log` de débogage ; casts `any`.

### Migration

Aucune migration de données n'est nécessaire : les documents Firestore existants sont lus par `normalizeUser` / `normalizeWine` et réécrits au nouveau format lors de leur prochaine modification.

À faire au déploiement : publier les règles Firestore **après** les avoir testées dans l'émulateur (`firebase deploy --only firestore`), puis `npm ci && npm run check && npm run build:prod && npx cap sync android`.

Sous Windows, si Git signale tous les fichiers comme modifiés après l'application de `.gitattributes` (fins de ligne), exécuter une fois `git add --renormalize .` puis valider.
