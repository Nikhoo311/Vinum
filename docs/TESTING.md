# Tests

## Commandes

| Commande | Effet |
|---|---|
| `npm test` | Karma + Jasmine en mode watch (Chrome) |
| `npm run test:ci` | Une seule passe, Chrome sans interface (`ChromeHeadlessCI`, avec `--no-sandbox`), pour la CI et les conteneurs |
| `npm run check:i18n` | Parité des traductions ([I18N](I18N.md#contrôle-automatique--npm-run-checki18n)) |
| `npm run check:icons` | Icônes utilisées ↔ icônes enregistrées |
| `npm run check` | i18n + icônes + lint + tests (identique à la CI) |

## Stratégie

La majeure partie de la logique est volontairement placée dans des **modules purs** (`src/app/core/utils/`), sans Angular ni Firebase. On les teste vite et sans mock. Les services et composants, minces, ne sont couverts que là où le comportement est critique.

| Niveau | Fichiers | Ce qui est couvert |
|---|---|---|
| Logique pure | `core/utils/*.util.spec.ts` (7 fichiers, 65 tests) | Placements et redimensionnement, statistiques, normalisation des vins et profils, préférences, erreurs, recherche |
| Gardes | `guards/auth.guard.spec.ts` | Redirections des trois gardes selon l'état de l'utilisateur (`TestBed` avec `AuthService` et `Router` simulés) |
| Composant | `components/search-bar/search-bar.component.spec.ts` | Debounce de 300 ms, dernière frappe seule, `clear()` |
| Contrôles de cohérence | `scripts/check-i18n.mjs`, `scripts/check-icons.mjs` | Traductions et icônes |

### Ce qui n'est pas testé automatiquement

- Les services Firebase (`AuthService`, `CaveService`) : ils nécessitent l'émulateur Firebase. Leur logique de décision est extraite dans `core/utils` pour être testée là.
- Les pages et la plupart des composants (rendu, interaction).
- Les règles Firestore (à tester dans l'émulateur, voir [Sécurité](SECURITY.md#vérifications-à-faire-avant-la-mise-en-production)).

> **État de la revue** : les 65 tests purs ont été exécutés et réussissent (via `tsx` et une couche de compatibilité Jasmine), ainsi que la vérification de types de ces modules. Les tests Karma (`guards`, `search-bar`) et la compilation Angular **n'ont pas pu être exécutés** dans l'environnement de la revue (installation des dépendances impossible) ; à lancer avec `npm ci && npm run check`.

## Écrire un test

### Logique pure — cas le plus courant

```ts
// src/app/core/utils/mon-calcul.util.spec.ts
import { monCalcul } from './mon-calcul.util';
import { makeWine } from './testing.fixtures';

describe('monCalcul', () => {
  it('compte les bouteilles', () => {
    const wine = makeWine({ placements: [{ row: 0, col: 0 }, { row: 0, col: 1 }] });
    expect(monCalcul([wine])).toBe(2);
  });
});
```

`makeWine(overrides)` (dans `testing.fixtures.ts`) fabrique un `UserWine` complet et valide.

### Composant ou garde

Utiliser `TestBed` avec des **fournisseurs simulés** pour tout service qui touche Firebase :

```ts
TestBed.configureTestingModule({
  providers: [
    { provide: AuthService, useValue: { waitUntilReady: () => Promise.resolve(null) } },
    { provide: Router, useValue: { createUrlTree: (c: string[]) => c } },
  ],
});
```

Pour un composant qui utilise Transloco, importer `TranslocoTestingModule.forRoot({ langs: { fr: {} }, translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' } })`. Pour les minuteries (debounce), `fakeAsync` + `tick`.

### Règles

- Un test = un comportement, nommé en français comme une phrase (« retombe sur la valeur par défaut si la langue est inconnue »).
- Pas de dépendance à l'horloge réelle, au réseau ou à Firebase.
- Un bug corrigé reçoit un test qui l'aurait détecté.
- Ne jamais commiter de fichier `*.spec.ts` généré par le CLI sans l'avoir complété : un test « should create » qui échoue faute de fournisseurs rend la suite rouge et masque les vraies régressions (c'était le cas de 22 fichiers avant la revue).
