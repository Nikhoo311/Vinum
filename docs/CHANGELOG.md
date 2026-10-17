# Journal des changements

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Les détails et la justification de chaque point sont dans la [revue de code](REVIEW.md).

## [Non publié]

### Ajouté

- **Alertes de maturité** : notification locale le jour d'ajout d'un vin, dans son année d'apogée (`MaturityNotificationService`, `maturity.util`). Nouveau champ `addedAt` sur les fiches. Nécessite `npm install @capacitor/local-notifications` puis `npx cap sync android`.

- **Catalogue** (fusion de la branche `main`, reprise dans l'architecture revue) : `CatalogueService` (`inject()`, observable des fiches personnelles validées, enregistrement des propositions avec horodatage serveur), `core/utils/catalogue.util.ts` (+ 13 tests), vins communs dans `catalogue/community-wines.ts`.
- **Règles Firestore** pour `users/{uid}/catalogue` et `catalogueProposals` : sans elles, la création de fiches et de propositions était refusée en production.
- Traductions anglaise, espagnole et italienne du catalogue ; clés `CATALOGUE.STATUS_ALL`, `CATALOGUE.NO_PERSONAL`.
- `app-select` et `app-checkbox` : composants réutilisables (liste de sélection, case à cocher cliquable sur toute la ligne).

- **Vin star configurable** : Réglages → Cave → « Calcul du vin star » (`StarWinePage`, `StarWineService`, `star-wine.util` + 9 tests). Sept critères : prix unitaire, valeur en cave, millésime le plus ancien, mieux noté, meilleur rapport qualité/prix, plus longtemps en cave, plus gros stock. Aperçu immédiat, repli sur le prix si aucun vin n'est éligible. Préférence `starWineCriterion` de l'appareil ; traductions fr/en/es/it ; 5 icônes ajoutées.

### Corrigé

- **Application bloquée après le retrait d'une bouteille** : la fenêtre de notation et la fiche du vin se fermaient en même temps, ce qui laissait un fond d'écran bloquant tous les appuis. La fiche ne se ferme maintenant qu'une fois la fenêtre de notation fermée (`WineSheetModalComponent.onRatingDismissed`).

### Modifié

- **Accueil — vin star** : suit le critère choisi, affiche la valeur qui l'a désigné ; l'infobulle indique le critère et renvoie vers le réglage. `CaveStats.starWine` et `CaveService.starWine` supprimés (remplacés par `StarWineService`).
- **Listes de sélection** : `app-select` réécrit sans `ion-select` (liste insérée sous le champ, clavier, fermeture au clic extérieur, scroll interne) ; le statut des filtres devient un vrai groupe `radiogroup` de boutons. Règles CSS `app-select-popover` supprimées de `global.scss`.
- **Catalogue — interface** : carte « Liste de souhaits » alignée et sans étoile décorative ; étoile identique sur les cartes et dans la liste ; bouton « Mettre en cave » identique partout (icône verre, texte en gras, plus petit dans la liste) ; bouton « Liste de souhaits » de la fiche lisible (contour, étoile visible, remplie quand le vin y figure) ; filtres : bouton de la même hauteur que la recherche avec icône agrandie, statut en boutons radio cliquables sur toute la ligne, région et tri sur une ligne à deux colonnes, listes de sélection redessinées ; « Mes fiches » : marge autour du « + », texte « Pour un vin absent du catalogue commun » retiré, message dédié quand il n'y a aucune fiche (au lieu de « Aucun vin ne correspond… »).
- **Formulaire de vin** : choisir un type pré-remplit les accords mets-vins (ajout, modification, catalogue), tant que le champ est vide ou n'a pas été modifié.
- **Accueil** : la carte « Liste de souhaits » affiche le nombre réel de vins.
- **Fusion de la branche `main`** : conflits résolus dans `add-wine-form`, `wine-sheet-modal` (entrées `catalogueMode`, `isWishlisted`, sorties `wishlistToggle`, `addToCave`) et `tabs-routing` ; le drapeau `features.catalogue` passe à `true`.
- **Budgets** : feuille de style de composant 12 Ko / 16 Ko (page Catalogue).
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
