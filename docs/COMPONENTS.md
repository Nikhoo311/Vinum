# Composants et pages

Tous les composants et pages sont **standalone**. Les sélecteurs sont préfixés `app-`.

## Composants réutilisables (`src/app/components/`)

### Saisie et formulaires

#### `app-input` — `InputComponent`
Champ de saisie Ionic relié à un `AbstractControl`, avec libellé, icône facultative, œil d'affichage du mot de passe et messages d'erreur.

| Entrée | Type | Défaut | Rôle |
|---|---|---|---|
| `label` *(obligatoire)* | `string` | — | Libellé |
| `control` *(obligatoire)* | `AbstractControl \| null` | — | Contrôle de formulaire |
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'tel'` | `'text'` | Type de champ |
| `placeholder` | `string` | `''` | Texte d'aide |
| `min`, `max`, `step` | `number` | — | Bornes (type `number`) |
| `iconName`, `showIcon` | `string`, `boolean` | `''`, `false` | Icône à gauche |
| `showEye` | `boolean` | `false` | Bouton afficher/masquer le mot de passe |
| `canEdit` | `boolean` | `false` | Bascule « lecture seule / modifiable » (page infos personnelles) |
| `grouped` | `boolean` | `true` | Présentation groupée dans une carte |
| `required`, `showRequirement` | `boolean` | `false` | Astérisque d'obligation (avec `aria-label` traduit) |

#### `app-text-area-input` — `TextAreaInputComponent`
Zone de texte multi-lignes : `label`, `control` (obligatoires), `placeholder`, `autoGrow` (défaut `true`), `required`, `showRequirement`.

#### `app-form-error` — `FormErrorComponent`
Affiche le message du **premier** validateur en échec d'un contrôle touché. Entrée : `control`. Erreurs gérées : `required`, `email`, `minlength`, `passwordMismatch`, `emailAlreadyTaken`, `min`, `max`, `maxlength`, `pattern` (année à quatre chiffres), `peakMaturityYearBeforeVintage`, `halfStepRating` ; toute autre erreur affiche `FORM_ERRORS.INVALID`.

#### `app-stepper` — `StepperComponent`
Sélecteur numérique « − n + » lié à un contrôle (rangées/colonnes). Entrées : `control`, `label` (obligatoires), `min` (1), `max` (999), `step` (1). `OnPush` ; boutons accessibles (`aria-label` traduit).

#### `app-wines-radio-group` — `WinesRadioGroupComponent`
Choix du type de vin (rouge, blanc, rosé, champagne) avec bouteille illustrée. Entrées : `control` (obligatoire), `defaultValue` (présélection si le contrôle est vide), `row` (affichage en ligne, utilisé dans le formulaire d'ajout).

#### `app-add-wine-form` — `AddWineFormComponent`
Formulaire complet d'ajout/modification d'un vin (aperçu en direct, type, nom, domaine, millésime, apogée, région, cépage, prix, note, notes de dégustation, accords, quantité). Entrées : `form` (obligatoire, construit par `createWineForm`), `formId`, `maxQuantity`, `showQuantity`. Sortie : `formSubmit`.

#### `app-select` — `SelectComponent`
Liste de sélection d'une valeur, au même style que les champs de saisie (libellé en capitales, bordure 1,5 px). Entrées : `label`, `value`, `options` (`SelectOption[]` : `{value, label}`), `placeholder`. Sortie : `valueChange`. Liste **maison** (déclencheur + liste insérée sous le champ, clavier ↑ ↓ Entrée Échap, fermeture au clic extérieur) : la popover d'`ion-select` était mal positionnée dans les modales à crans.

#### `app-checkbox` — `CheckboxComponent`
Case à cocher dont **toute la ligne** est cliquable. Entrées : `label`, `description`, `checked`, `disabled`. Sortie : `checkedChange`.

### Authentification

| Sélecteur | Rôle |
|---|---|
| `app-login-form` | Formulaire e-mail/mot de passe, « mot de passe oublié » |
| `app-register-form` | Inscription avec confirmation du mot de passe (validateur de concordance) |
| `app-utils` | Affiche l'un ou l'autre selon l'entrée `mode` (`AuthTypeEnum`) |

Les deux formulaires empêchent le double envoi (`loading`), valident avant d'appeler `AuthService` et traduisent l'erreur avec `toErrorKey`.

### Cave

#### `app-cellar-cell` — `CellarCellComponent`
Case de la grille. Entrées : `positionLabel` (obligatoire, ex. « A3 »), `wineType`, `wineName`, `wineVintage`. Sortie : `cellTap`. `OnPush` ; couleur selon le type de vin, étiquette adaptée au thème sombre.

#### `app-search-bar` — `SearchBarComponent`
Barre de recherche avec compteur de résultats. Entrée : `items` (signal obligatoire, `SearchableItem[]`). Sortie : `queryChange` (signal `output`), émise **300 ms après la dernière frappe**. Le composant ne filtre rien lui-même : la page décide de l'affichage avec la même fonction `searchItems`.

#### `app-wine-sheet-modal` — `WineSheetModalComponent`
Fiche détaillée d'un vin : informations, étoiles de notation (demi-points), modification, retrait d'une bouteille.

| Entrée / sortie | Rôle |
|---|---|
| `wine` *(obligatoire)* | Vin affiché |
| `canRemoveBottle` *(obligatoire)* | Autorise « Retirer une bouteille » (faux depuis l'accueil) |
| `isOpen` / `isOpenChange` | Liaison bidirectionnelle `[(isOpen)]` |
| `coords` | Emplacement de la bouteille consultée (requis pour la retirer) |
| `catalogueMode` | Mode catalogue : pas de notation ni de modification ; boutons « Liste de souhaits » et « Mettre en cave » |
| `isWishlisted` / `wishlistToggle` / `addToCave` | État de l'étoile et événements des deux boutons du mode catalogue |

#### `app-custom-modal` — `CustomModalComponent`
Feuille modale Ionic à crans (*breakpoints*) avec projection de contenu : le contenu principal, et un pied de page via l'attribut `modal-footer`.

| Entrée / sortie | Défaut |
|---|---|
| `isOpen` | `false` |
| `initialBreakpoint` | `0.95` |
| `breakpoints` | `[0, 0.5, 0.7, 0.95]` |
| `background` | `null` |
| `footerHasBackground` | `true` |
| `showCloseButton` | `true` (bouton avec `aria-label` traduit) |
| `didDismiss` *(sortie)* | émise à la fermeture |

## Pages

| Page | Dossier | Rôle |
|---|---|---|
| `AuthPage` | `auth/` | Bascule connexion/inscription, connexion Google (`loading` pour éviter les doubles appuis, annulation silencieuse) |
| `PreferencePage` | `preference/` | Onboarding en 4 écrans : identité → vin préféré → taille de la cave (plafond `CAVE_MAX`) → confirmation. Écrit le profil avec `saveUserPreferences`, protège contre le double envoi, affiche un toast en cas d'échec |
| `TabsPage` | `tabs/` | Barre d'onglets et balayage horizontal |
| `HomePage` | `home/` | Tableau de bord : stock, valeur, vin star, taux de remplissage, note moyenne, répartition par type et par région. Montants et pourcentages formatés selon la langue (`Intl`). Le vin star suit le critère choisi (valeur affichée sous le nom, infobulle avec lien vers le réglage). Carte « Liste de souhaits » derrière `features.catalogue` |
| `CavePage` | `cave/` | Grille de la cave, recherche, ajout de bouteille(s) : un appui sur une case vide ouvre le formulaire, les `quantity` bouteilles sont placées sur les cases libres à partir de la case touchée (parcours circulaire) |
| `CataloguePage` | `catalogue/` | <a id="catalogue"></a>Catalogue (communauté / mes fiches) : recherche, filtres (type, statut en boutons radio, région, tri) dans une modale, liste de souhaits, fiche détaillée (`app-wine-sheet-modal` en `catalogueMode`), mise en cave (premier emplacement + quantité), création de fiche personnelle et proposition au catalogue commun. La liste affichée est **recalculée par `refresh()`** à chaque changement de critère ou de donnée (pas à chaque cycle de détection). Les trois formulaires partagent `createWineForm` ; les accords mets-vins se pré-remplissent selon le type choisi (`app-add-wine-form`). Texte entièrement traduit (`CATALOGUE.*`) |
| `SettingsPage` | `settings/` | Compte, cave (disposition, affichage grille/liste, alertes de maturité*), apparence (thème, langue) |
| `PersonalInformationPage` | `settings/personal-information/` | Nom, e-mail (avec ré-authentification), mot de passe (modale), déconnexion, suppression du compte |
| `StarWinePage` | `settings/star-wine/` | Réglage « Calcul du vin star » : aperçu du vin désigné (avec la valeur qui l'a placé en tête), puis sept critères en trois groupes (Valeur, Caractère, Divers) au format boutons radio. Le choix s'applique immédiatement ; chaque critère sans vin éligible déclenche un message et le repli sur le prix. Ligne d'entrée dans Réglages → Cave, avec pastille « Nouveau » |
| `FavoriteWinePage` | `settings/favorite-wine/` | Changement du type de vin préféré (présélection = valeur du profil) |
| `LanguagePage` | `settings/language/` | Choix de la langue, appliqué immédiatement |

\* Le réglage « Alertes de maturité » n'est affiché que si `features.maturityAlerts` est vrai.

### Redimensionnement de la cave (Réglages → Disposition)

1. L'utilisateur ajuste rangées × colonnes (plafond `CAVE_MAX`).
2. `CaveService.previewResize` calcule ce qui serait retiré, **sans rien écrire**.
3. Si des bouteilles sortent de la grille, une alerte demande confirmation en indiquant leur nombre (« Cette action est irréversible »).
4. `CaveService.resizeCave` applique tout dans un lot atomique.

## Formulaire de vin partagé (`core/forms/wine-form.ts`)

Ajout et modification utilisent le **même** formulaire, pour garantir les mêmes validations :

- `createWineForm(fb)` — formulaire typé (type, nom, domaine, région, millésime, apogée, cépage, prix, note, description, accords, quantité).
- Validateurs maison : `peakMaturityYearAfterVintage`, `halfStepRating`.
- `wineDetailsFromForm(value)` — convertit en `WineDetails` ; une chaîne vide ou blanche devient « absent » (le champ n'est pas écrit).
- `emptyWineFormValue(defaultFoodPairing)` / `wineFormValueFrom(wine)` — valeurs initiales (ajout / modification).

## Accessibilité

- Icônes décoratives : `aria-hidden="true"` ; images décoratives : `alt=""`.
- Boutons contenant uniquement une icône : `aria-label` traduit (`COMMON.BACK`, `COMMON.CLOSE`, `COMMON.INCREASE`…).
- Étoile « champ obligatoire » : `aria-label` traduit (`COMMON.REQUIRED`).
- L'attribut `lang` du document suit la langue choisie.
