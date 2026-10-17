# Revue de code

Revue complète du code, de la configuration, des fichiers Android et de la documentation, en vue de la mise en production. Ce document liste ce qui a été constaté, ce qui a été corrigé, et ce qui reste à faire. Le détail des changements figure dans le [journal](CHANGELOG.md).

**Périmètre** : `src/` (≈ 230 fichiers du projet), `angular.json`, `package.json`, `tsconfig*.json`, `karma.conf.js`, `capacitor.config.ts`, `android/`, `firebase.json`, README.

**Limite de la revue** : l'environnement n'avait pas accès au registre npm. Les dépendances n'ont pas pu être installées ; **Angular, ESLint, Karma et le build n'ont donc pas été exécutés**. La logique pure a été vérifiée (typage strict + 65 tests exécutés). Voir [Ce qui reste à vérifier](#ce-qui-reste-à-vérifier-sur-votre-poste).

## Synthèse

| Gravité | Constats | Corrigés |
|---|---|---|
| Critique (bloquant pour la production) | 7 | 7 |
| Important | 14 | 14 |
| Mineur / qualité | 14 | 14 |

## Constats critiques

| # | Constat | Correction |
|---|---|---|
| C1 | **Aucune règle de sécurité Firestore** (`firebase.json` vide `{}`) : sans règles déployées, la base est soit ouverte, soit fermée par défaut selon la date de création du projet, et rien n'est versionné | `firestore.rules` (accès propriétaire uniquement, validation des champs, refus par défaut), `firebase.json`, `firestore.indexes.json`, `.firebaserc`. [Sécurité](SECURITY.md) |
| C2 | **`en.json`, `es.json`, `it.json` vides (0 octet)** alors que le README annonce l'anglais : choisir une de ces langues provoquait une erreur de chargement et des clés brutes à l'écran | Traductions complètes dans les 4 langues, `AVAILABLE_LANGS` mis à jour, `check:i18n` |
| C3 | **Suite de tests rouge** : 22 fichiers `*.spec.ts` générés par le CLI (« should create ») échouaient faute de fournisseurs, masquant toute vraie régression | Supprimés ; remplacés par des tests réels ([Tests](TESTING.md)) |
| C4 | **Redimensionnement de la cave non atomique** : les bouteilles hors grille étaient supprimées **avant** l'enregistrement de la nouvelle disposition, **sans confirmation**, avec une pause artificielle de 2 s ; un échec en cours de route laissait des données perdues ou incohérentes | `previewResize` + alerte de confirmation + `resizeCave` en un seul `writeBatch` |
| C5 | **Aucune signature de release Android** configurée | `signingConfigs` lisant `keystore.properties` (ignoré par Git) + modèle + procédure ([Android](ANDROID-RELEASE.md)) |
| C6 | **`android:allowBackup="true"`** : la session Firebase et le cache Firestore partaient dans les sauvegardes Android | `allowBackup="false"` |
| C7 | **Double session d'authentification** (`skipNativeAuth: false` alors que le code reconstruit une session avec le SDK JS à partir de l'`idToken`) : deux sessions pouvant diverger, déconnexion partielle | `skipNativeAuth: true` ; `logout` et `deleteAccount` ferment aussi la session native |

## Constats importants

| # | Constat | Correction |
|---|---|---|
| I1 | Texte en dur en français dans le code (« Veuillez vous reconnecté… » — faute comprise —, messages d'erreur) | Clés de traduction (`SETTINGS.ACCOUNT_PAGE.EMAIL_CHANGED_NOTICE`, `ERRORS.*`…) |
| I2 | Le service d'authentification **traduisait** les erreurs (mélange des couches) et exposait `err.message` brut | Les services lèvent des erreurs brutes ; `toErrorKey` traduit côté interface |
| I3 | Page « vin préféré » : valeur courante lue dans `history.state` (perdue au rechargement ou en navigation directe) | Lecture depuis le profil |
| I4 | Page de réglages : accès `LANGUAGE_CONFIG[…]` sans garde (plantage si la langue stockée est inconnue) | Accès sûr avec repli sur le code |
| I5 | Réglage « Alertes de maturité » sans effet (fonction non implémentée) et onglet « Catalogue » pointant vers l'accueil | Masqués derrière `environment.features` ([Développement](DEVELOPMENT.md#fonctionnalités-désactivées)) |
| I6 | Gardes de route : fichiers mal nommés (`gest-guard`), garde répétée sur chaque onglet | Gardes fonctionnelles (qui attendent `waitUntilReady`), posées une seule fois sur le parent |
| I7 | Profil : `createdAt` typé `Date` alors que Firestore renvoie un `Timestamp` ; lecture du profil dépendante du réseau | Chaîne ISO, normalisation à la lecture, repli sur le cache |
| I8 | Écritures Firestore fragiles : champs `undefined` rejetés par le SDK, champs facultatifs impossibles à supprimer, `id`/`placements` pouvant être écrasés à la modification | `omitUndefined`, `deleteField`, exclusion explicite |
| I9 | Hors ligne, les écritures Firestore ne se résolvent qu'à la reconnexion : l'interface restait bloquée | `settle()` n'attend pas l'accusé serveur hors ligne |
| I10 | Tous les fichiers SVG d'Ionicons copiés dans `www/svg` à chaque build (poids de l'APK, temps de build) | Enregistrement explicite des 28 icônes utilisées (`core/icons.ts`) ; suppression de la copie dans `angular.json` |
| I11 | Pas de protection contre le **double envoi** (connexion, inscription, onboarding, ajout, redimensionnement) | États `loading` / `saving`, boutons désactivés |
| I12 | `as any` dans l'onboarding, erreur d'enregistrement du profil **silencieuse** (juste un `console.error`) | Types stricts, toast d'erreur traduit |
| I13 | Fuite d'abonnements (stepper) et `effect` pour synchroniser la recherche | `takeUntilDestroyed`, sortie `queryChange` avec debounce |
| I14 | Métadonnées de gabarit : titre « Ionic App », `lang="en"`, nom de projet « rememberMe », auteur « Ionic Framework », version `0.0.1`, test Android sur le mauvais package | Corrigés |

## Constats mineurs

| # | Constat | Correction |
|---|---|---|
| M1 | `console.log` de débogage et déconnexion de test dans la page d'accueil | Supprimés |
| M2 | Imports absolus `src/app/...` (sans alias déclaré) | Imports relatifs |
| M3 | Coquille `CAVE_MAX_PRENIUM` | `CAVE_MAX_PREMIUM` |
| M4 | Classe `WinesRadioGroup` (incohérente avec les autres composants) | `WinesRadioGroupComponent` |
| M5 | Sélecteur aligné sur le préfixe `app-` ; messages d'erreur incomplets (note, validité générique) | Sélecteur et messages corrigés (`FORM_ERRORS.HALF_STEP`, `INVALID`) |
| M6 | Clé `TABS.STATS` pour un onglet qui s'affiche « Catalogue » | `TABS.CATALOGUE` |
| M7 | Français : mélange tutoiement/vouvoiement (« Ajuste… ta cave »), « type vin préféré » | Vouvoiement partout, faute corrigée |
| M8 | Accessibilité : boutons-icônes sans nom, images décoratives annoncées, étoile « obligatoire » muette, `lang` du document fixe | `aria-label` traduits, `alt=""`, `aria-hidden`, `lang` dynamique |
| M9 | Formatage des montants et pourcentages non lié à la langue active | `Intl` selon la langue active |
| M10 | Dépendance à `PreferencesService` dans chaque cellule de la grille (coût × nombre de cases) | Thème sombre par CSS (`:host-context(body.dark)`) |
| M11 | Injection par constructeur ; `tsconfig` limité à `lib: es2020` | `inject()`, `lib: es2022` |
| M12 | Fins de ligne mixtes CRLF/LF | `.gitattributes` (LF), `.editorconfig` |
| M13 | Secrets de signature absents du `.gitignore` | `keystore.properties`, `*.jks`, `*.keystore` ignorés |
| M14 | Documentation : un seul README de 476 lignes, avec des erreurs (`createdAt` « Date », plugins listés comme utilisés, nom `PRENIUM`, langues, gardes) | Documentation découpée par sujet ([index](README.md)) et corrigée |

## Changements de comportement à connaître

Ce ne sont pas des régressions mais des décisions prises pendant la revue :

1. **Recherche** : tous les mots saisis doivent être présents (ET logique), insensible à la casse et aux accents.
2. **Réglages → disposition** : une confirmation s'affiche si des bouteilles vont être retirées.
3. **Onboarding** : un prénom ou un nom composé uniquement d'espaces est refusé.
4. **Onglet Catalogue / liste de souhaits / alertes de maturité** : masqués jusqu'à leur implémentation.
5. **Anglais, espagnol, italien** réellement disponibles dans l'écran de choix de la langue.

## Limites connues

1. **Conflit d'emplacement multi-appareils.** La disponibilité d'une case est vérifiée côté client. Deux appareils du même compte ajoutant une bouteille sur la même case au même instant peuvent produire deux fiches sur un même emplacement. Solution complète : fonction Cloud ou transaction sur un document « carte de la cave » ; jugé disproportionné pour une cave personnelle.
2. **Suppression de compte non transactionnelle.** Vins → profil → compte Auth sont supprimés séquentiellement côté client ; une interruption laisse un compte sans données (relançable) — jamais des données sans compte. Voir l'extension « Delete User Data » ([Sécurité](SECURITY.md#recommandations-complémentaires)).
3. **`CAVE_MAX = 24` est une règle d'interface**, pas une règle serveur : les règles Firestore autorisent jusqu'à 240 emplacements. Une vraie offre « premium » exigerait un contrôle serveur.
4. **Polices Google Fonts chargées depuis le CDN** (`global.scss`) : au premier lancement hors ligne, la police de repli s'affiche ; et la requête transmet l'adresse IP à Google (point d'attention RGPD).
5. **Lecture complète de la sous-collection des vins** à chaque ouverture : acceptable (≤ 240 fiches), à revoir si le plafond monte beaucoup.
6. **Catalogue** : fonction en projet, non présente dans ce dépôt (masquée).
7. **Alertes de maturité** : notifications locales, donc propres à l'appareil ; les fiches créées avant l'ajout de `addedAt` sont notifiées le 1er janvier de leur année d'apogée.

## Améliorations recommandées (non réalisées)

Non faites car elles exigent d'installer des dépendances et de vérifier un build — ce qui était impossible pendant la revue — ou qu'elles relèvent d'un choix produit.

| Priorité | Amélioration | Intérêt |
|---|---|---|
| Haute | **Auto-héberger la police** (Quicksand) dans `src/assets/fonts` | Fonctionnement hors ligne, performance, conformité RGPD |
| Haute | **Retirer les plugins Capacitor inutilisés** : `@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard` (aucun import dans le code) puis `npx cap sync` | APK plus léger, surface d'attaque réduite |
| Haute | **Activer App Check** (Play Integrity) et restreindre la clé d'API | Empêche l'usage du backend par d'autres clients |
| Moyenne | Passer aux composants Ionic **standalone** (`@ionic/angular/standalone`) et au builder `application` d'Angular | *Bundle* plus petit, build plus rapide |
| Moyenne | Passer ESLint en configuration *flat* (`eslint.config.js`) et activer des règles supplémentaires (`no-console`, `no-explicit-any`) | Qualité durable |
| Moyenne | Tests de services avec l'émulateur Firebase ; tests de composants clés (formulaire d'ajout, fiche vin) | Couverture des chemins critiques |
| Moyenne | Journalisation des erreurs (Firebase Crashlytics ou équivalent) | Visibilité en production |
| Basse | `OnPush` sur tous les composants | Performance |
| Basse | Renommer `columnLetters` en `rowLetters` (elle convertit un index de rangée) | Lisibilité |
| Basse | Export / import de la cave (CSV), partage — voir la feuille de route du README d'origine | Produit |

## Ce qui reste à vérifier sur votre poste

À exécuter une fois, dans cet ordre :

```bash
npm ci               # installe les dépendances (package-lock.json inchangé)
npm run check        # i18n + icônes + lint + tests Karma
npm run build:prod   # build de production : surveiller les avertissements de budget
npx cap sync android
```

Puis les vérifications manuelles de la [liste de contrôle de publication](ANDROID-RELEASE.md#liste-de-contrôle-avant-publication) et le test des règles Firestore dans l'émulateur ([Sécurité](SECURITY.md#vérifications-à-faire-avant-la-mise-en-production)).

Points de vigilance probables au premier `npm run check` / build, à corriger au cas par cas s'ils apparaissent : avertissements ESLint sur du code existant non réécrit, erreurs de typage de gabarits stricts dans les fichiers réécrits sans compilateur (les modules purs, eux, ont été compilés), budget de style de composant dépassé.
