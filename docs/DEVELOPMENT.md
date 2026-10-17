# Développement

## Environnement

| Outil | Version |
|---|---|
| Node.js | 20.19+ ou 22.12+ (exigé par Angular 20) |
| npm | 10+ |
| TypeScript | 5.8.3 (version épinglée dans `package.json`) |
| Chrome | pour les tests Karma et le débogage |

```bash
npm ci          # installe exactement les versions de package-lock.json
npm start       # http://localhost:4200
```

Utiliser `npm install` uniquement pour **ajouter ou mettre à jour** une dépendance (et commiter `package-lock.json`).

Les fins de ligne sont normalisées en LF (`.gitattributes`, `.editorconfig`). Sous Windows, configurer l'éditeur sur LF ou laisser Git convertir (`core.autocrlf`).

## Configuration par environnement

`src/environments/environment.ts` (développement) et `environment.prod.ts` (production, substitué par `fileReplacements` au build de production). Les deux contiennent la configuration web Firebase et les drapeaux de fonctionnalités. Les valeurs Firebase sont publiques ([Sécurité](SECURITY.md#secrets-et-configuration-publique)).

### Fonctionnalités désactivées

Deux fonctionnalités sont pilotées par des drapeaux (`environment.features`). `catalogue` est à `false` (inachevé) ; `maturityAlerts` est à `true` :

| Drapeau | Ce qu'il masque |
|---|---|
| `catalogue` | Onglet « Catalogue » (route `/catalogue`, balayage entre onglets) et carte « Liste de souhaits » de l'accueil |
| `maturityAlerts` | Réglage « Alertes de maturité » et programmation des notifications ([Services](SERVICES.md#maturitynotificationservice)) |

Pour travailler dessus, passer le drapeau à `true` dans `environment.ts` **uniquement**. Ne pas l'activer dans `environment.prod.ts` avant que la fonctionnalité soit terminée : un réglage qui ne fait rien est trompeur pour l'utilisateur.

## Conventions de code

- **TypeScript strict** (`strict`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, `strictTemplates`…). Pas de `any` ; pas de `console.log` de débogage (le seul `console.error` toléré journalise une erreur réellement traitée).
- **Injection** par `inject()`, pas par constructeur. Services en `providedIn: 'root'`.
- **Imports relatifs** (`../core/...`), jamais `src/app/...` : ces chemins absolus échouent dans certains outils (tests, ESLint, IDE) et n'ont pas d'alias déclaré.
- **Abonnements** : `async` pipe en priorité ; sinon `takeUntilDestroyed(this.destroyRef)`. Aucun abonnement manuel sans désabonnement.
- **Logique** sans dépendance au framework → `core/utils/` avec son test (`*.util.spec.ts`).
- **Textes** : toujours une clé de traduction, jamais de chaîne en dur ([I18N](I18N.md)).
- **Erreurs** : les services lèvent, les pages attrapent et affichent un toast traduit (`toErrorKey`). Toujours désactiver le bouton d'envoi pendant l'opération (`loading` / `saving`) pour éviter les doublons.
- **Écritures Firestore** : passer par `CaveService` ; ne jamais écrire dans `users/{uid}/wine` depuis une page. Pour plusieurs documents liés, utiliser un `writeBatch` (voir `resizeCave`).
- **Icônes** : une icône référencée par son nom (`<ion-icon name="…">`) doit être ajoutée à `core/icons.ts` (`npm run check:icons`).
- **Composants** : sélecteur `app-…` en kebab-case, classe suffixée `Component` ou `Page` (règles ESLint).
- **Gabarits** : `@if` / `@for` (syntaxe de contrôle de flux moderne), `===` (règle `eqeqeq`), `alt=""` + `aria-hidden` pour le décoratif.

## Ajouter une fonctionnalité : check-list

1. Modèle ou champ Firestore ? → `core/models`, `DATA-MODEL.md`, `firestore.rules`.
2. Logique de calcul ? → fonction pure dans `core/utils` + test.
3. Accès aux données ? → méthode de service (+ `SERVICES.md`).
4. Interface ? → composant/page standalone, textes en clés (4 langues), icônes enregistrées.
5. Route ? → module de routage lazy + garde héritée du parent (+ `ROUTING.md`).
6. `npm run check`.

## Styles et thème

- Variables Ionic et palette dans `src/theme/variables.scss` ; styles globaux dans `src/global.scss`.
- Le thème sombre repose sur la classe `dark` ajoutée à `<body>` par `PreferencesService` (et non sur `prefers-color-scheme` directement). Dans un composant, cibler le thème sombre avec `:host-context(body.dark)`.
- Une police Google Fonts (Quicksand) est importée depuis `global.scss` : voir [Revue](REVIEW.md#améliorations-recommandées-non-réalisées).

## Budgets de build

`angular.json` définit des budgets pour la configuration de production : avertissement à 2 Mo pour le *bundle* initial (erreur à 5 Mo) et 4 Ko / 8 Ko par feuille de style de composant. Un dépassement doit être investigué (import accidentel d'une grosse bibliothèque, icônes) plutôt que « corrigé » en relevant le seuil.
