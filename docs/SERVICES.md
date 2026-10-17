# Services

Tous les services sont `providedIn: 'root'` et se trouvent dans `src/app/core/services/`. Ils utilisent `inject()`. Les erreurs sont **levées brutes** : c'est à la page appelante de les traduire (voir [Architecture](ARCHITECTURE.md#5-erreurs--des-clés-jamais-du-texte)).

## AuthService

Authentification Firebase et profil utilisateur (`users/{uid}`).

### État

| Membre | Description |
|---|---|
| `currentUser$` | `Observable<User \| null>` — profil courant, `null` si déconnecté |
| `currentUser` | Valeur synchrone du profil courant |
| `waitUntilReady()` | Promesse résolue quand la session Firebase a été restaurée (ou absente) ; utilisée par les gardes |

### Connexion et compte

| Méthode | Description |
|---|---|
| `register(email, password)` | Crée le compte e-mail, crée/synchronise le profil, redirige vers `/preference` |
| `login(email, password)` | Connexion e-mail ; redirige vers `/home` (ou `/preference` si l'onboarding n'est pas terminé) |
| `loginWithGoogle()` | Connexion Google native : obtient l'`idToken` via le plugin Capacitor, puis `signInWithCredential` côté SDK JS. Lève `AppError('AUTH.GOOGLE_ERROR')` si aucun jeton n'est renvoyé |
| `logout()` | Déconnecte Firebase **et** la session native Google, vide l'état, redirige vers `/auth` |
| `sendPasswordResetEmail(email)` | Envoie l'e-mail de réinitialisation |
| `deleteAccount(password?)` | Ré-authentifie (mot de passe, ou Google), supprime les vins par lots de 500 (limite Firestore), le profil, puis le compte Auth |

### Profil

| Méthode | Description |
|---|---|
| `saveUserPreferences(user)` | Écrit le profil complet (`setDoc` avec `merge`) — fin d'onboarding |
| `updatePersonalInfo({firstName,lastName,email}, currentPassword?)` | Met à jour nom/prénom. Un changement d'e-mail exige le mot de passe (ré-authentification) puis `verifyBeforeUpdateEmail` : l'adresse ne change qu'après clic sur le lien reçu |
| `updatePassword(old, new)` | Ré-authentifie puis change le mot de passe (refusé pour un compte Google) |
| `updateFavoriteWine(type)` | Met à jour le type de vin préféré |
| `updateCaveConfig({rows?, cols?, viewMode?})` | Fusionne dans `caveConfig`. **Ne gère pas les bouteilles** : pour redimensionner la cave, utiliser `CaveService.resizeCave` |
| `patchLocalUser(patch)` | Met à jour l'état en mémoire après une écriture déjà faite ailleurs |

### Comportements à connaître

- **Hors ligne** : la lecture du profil retombe sur le cache Firestore (`getDocFromCache`) ; un compte déjà connu reste utilisable sans réseau.
- **Adresse e-mail** : l'adresse du compte Firebase Auth fait foi ; si elle diffère du profil (après validation d'un changement), le profil est corrigé en arrière-plan.
- Pas de traduction des erreurs dans ce service : il lève des `FirebaseError` ou des `AppError`.

## CaveService

Cave de l'utilisateur connecté (`users/{uid}/wine`). Un écouteur temps réel alimente la liste ; il démarre à la connexion et s'arrête à la déconnexion.

### Observables

| Membre | Description |
|---|---|
| `wines$` | Liste des fiches de vin (triée par nom, insensible aux accents) |
| `stats$` | Statistiques dérivées de `wines$` |
| `grid$` | `CaveSlot[]` — chaque case de la grille (occupée ou vide), recalculée quand le profil ou les vins changent |

### Lecture synchrone

| Membre | Description |
|---|---|
| `cave` | Fiches de vin courantes |
| `caveConfig` | Disposition (`rows`, `cols`, `viewMode`) |
| `stats` | Statistiques courantes, **mémorisées** tant que la liste ne change pas |
| `totalCapacity`, `occupiedCount`, `totalBottles`, `totalValue`, `starWine`, `uniqueRegionsCount`, `averageRating` | Raccourcis sur `stats` / la configuration |
| `winesSortedByRatingDesc` | Vins notés, du mieux noté au moins bien noté |
| `formatPlacementCoords(placement)` | `{row:0,col:2}` → `"A3"` (lettre de la rangée + numéro de colonne) |

### Écriture

| Méthode | Description |
|---|---|
| `addWine(wine)` | Ajoute une fiche. Si le **même vin** existe déjà (nom + domaine + millésime + appellation + type, comparés sans tenir compte de la casse ni des espaces multiples), les nouveaux emplacements sont ajoutés à la fiche existante (`arrayUnion`) au lieu de créer un doublon |
| `updateWine(wine)` | Met à jour les champs descriptifs. `id`, `ownerId` et `placements` ne sont jamais écrasés ; un champ facultatif retiré du formulaire (note, appellation…) est **supprimé** de Firestore (`deleteField`) |
| `updateWineRating(wineId, rating \| null)` | Note (de 0 à 5 ; le formulaire impose des demi-points) ou suppression de la note avec `null` |
| `removeBottle(wineId, placement)` | Retire un emplacement (`arrayRemove`) ; supprime la fiche quand il n'en reste plus |
| `deleteWine(wineId)` | Supprime la fiche et toutes ses bouteilles |
| `previewResize(rows, cols)` | **Simulation sans écriture** : renvoie un `ResizePlan` (`updates`, `deletions`, `removedBottles`) pour prévenir l'utilisateur |
| `resizeCave(rows, cols)` | Applique le redimensionnement dans **un seul lot atomique** (`writeBatch`) : placements retirés, fiches vidées supprimées, `caveConfig` mis à jour. Tout est appliqué ou rien. Limites : 1 ≤ rows, cols et rows × cols ≤ 240 |

### Limite connue

Deux appareils connectés au même compte qui placent une bouteille sur le même emplacement au même instant peuvent créer un conflit : Firestore n'offre pas de contrainte d'unicité sur le contenu d'un tableau. La vérification de disponibilité est faite côté client. Voir [Revue](REVIEW.md#limites-connues).

## PreferencesService

Préférences **de l'appareil** (non synchronisées entre appareils), stockées avec Capacitor Preferences.

| Membre | Description |
|---|---|
| `preferences$` / `current` | Préférences courantes (`darkMode`, `language`, `notificationsEnabled`) |
| `availableLangs` | Langues déclarées dans la configuration Transloco |
| `init()` | Appelée au démarrage par `provideAppInitializer`. Valide les valeurs lues (une valeur corrompue retombe sur le défaut), charge la langue **avant** de l'activer, applique le thème |
| `setDarkMode('light' \| 'dark' \| 'system')` | Enregistre et applique : classe `dark` sur `<body>`, `color-scheme`, style de la barre d'état Android |
| `setLanguage(code)` | Ignore un code non disponible ; met à jour `document.documentElement.lang` |
| `setNotificationsEnabled(bool)` | Enregistre l'intention (fonctionnalité d'alertes non encore implémentée) |

Valeurs par défaut : thème `light`, langue `fr`, notifications désactivées. En mode `system`, le thème suit `prefers-color-scheme` en direct.

## ToastService

Notifications éphémères (`ToastController` d'Ionic). Un nouveau toast **remplace** le précédent (pas d'empilement).

| Méthode | Icône / couleur |
|---|---|
| `success(message)` | succès |
| `error(message)` | erreur |
| `warning(message)` | avertissement |
| `info(message)` | information |

Chaque méthode renvoie une `Promise<void>` résolue quand le toast est présenté.

## MaturityNotificationService

Alertes de maturité par **notifications locales** (`@capacitor/local-notifications`), application native uniquement.

- Règle : une notification par vin **le jour et le mois d'ajout, dans l'année d'apogée**, à 10 h (ajouté le 03/10/2026, apogée 2028 → alerte le 03/10/2028). Sans `addedAt` (anciennes fiches) : le 1er janvier de l'année d'apogée. Un ajout un 29 février est ramené au 28.
- Seuls les vins encore en cave, avec une apogée future, sont programmés ; 60 au plus (limite iOS de 64).
- `start()` (appelé par `AppComponent`) reprogramme tout, après 500 ms d'attente, quand la cave, la langue ou le réglage change : l'agenda reste synchronisé (bouteille retirée, apogée modifiée, déconnexion…).
- `requestPermission()` : demande l'autorisation système ; refusée, le réglage reste désactivé et un message l'explique.
- Calcul dans `core/utils/maturity.util.ts` (`maturityDate`, `planMaturityNotifications`, `notificationIdFor`), testé.

## Utilitaires purs (`core/utils`)

Fonctions exportées principales — toutes sans effet de bord :

- **placement.util** : `columnLetters(index)` (index de rangée → A, B… AA), `formatPlacement(p)`, `placementKey(p)`, `comparePlacements(a,b)`, `isWithinBounds(p,rows,cols)`, `buildGrid(rows,cols,wines)`, `findFreePlacements(rows,cols,wines,start,quantity)` (recherche circulaire à partir de `start`), `planResize(wines,rows,cols)`.
- **cave-stats.util** : `computeCaveStats(wines)`, `fillPercentage(occupied,capacity)`, `percentageOf(part,total)`.
- **wine.util** : `normalizeText`, `isSameWine`, `parseFoodPairing`, `formatFoodPairing`, `isHalfStep`, `ratingKeySuffix`, `omitUndefined`, `normalizeWine`, `compareWinesByName`.
- **user.util** : `hasCompletedSetup(user)`, `toIsoString(value)`, `normalizeUser(raw, base)`.
- **preferences.util** : `sanitizePreferences(raw, availableLangs)`, `isDarkModeSetting`.
- **error.util** : `AppError`, `ERROR_KEYS`, `toErrorKey(error, fallback?)`, `errorCodeOf(error)`, `isUserCancellation(error)`.
- **maturity.util** : `maturityDate(addedAt, peakYear)`, `planMaturityNotifications(wines, now)`, `notificationIdFor(wineId)`.
- **search.util** : `normalizeSearchText`, `searchItems(items, query)` — chaque mot de la requête doit être trouvé (ET logique).
