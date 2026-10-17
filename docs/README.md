# Documentation de Vinum

Point d'entrée de la documentation technique. Le [README racine](../README.md) donne le démarrage rapide ; chaque document ci-dessous traite un sujet et un seul.

## Par où commencer ?

- **Je découvre le projet** → [Architecture](ARCHITECTURE.md), puis [Modèle de données](DATA-MODEL.md).
- **Je développe une fonctionnalité** → [Développement](DEVELOPMENT.md), [Services](SERVICES.md), [Composants et pages](COMPONENTS.md), [Tests](TESTING.md).
- **J'ajoute un texte ou une langue** → [Internationalisation](I18N.md).
- **Je prépare une mise en production** → [Sécurité et Firebase](SECURITY.md), puis [Android et publication](ANDROID-RELEASE.md).
- **Je reprends le code après la revue** → [Revue de code](REVIEW.md) et [Journal des changements](CHANGELOG.md).

## Index

| Document | Sujet |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Organisation du code, couches, flux de données |
| [SERVICES.md](SERVICES.md) | Référence des services applicatifs |
| [DATA-MODEL.md](DATA-MODEL.md) | Modèles et structure Firestore |
| [COMPONENTS.md](COMPONENTS.md) | Composants réutilisables et pages |
| [ROUTING.md](ROUTING.md) | Routes et gardes |
| [I18N.md](I18N.md) | Traductions |
| [SECURITY.md](SECURITY.md) | Sécurité, règles Firestore, secrets |
| [ANDROID-RELEASE.md](ANDROID-RELEASE.md) | Build et publication Android |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Environnement et conventions |
| [TESTING.md](TESTING.md) | Tests |
| [REVIEW.md](REVIEW.md) | Revue de code complète |
| [CHANGELOG.md](CHANGELOG.md) | Historique des changements |

## Maintenir cette documentation

Toute modification de comportement doit mettre à jour le document correspondant dans la même modification de code. En particulier : un nouveau service ou une nouvelle méthode publique → `SERVICES.md` ; un champ Firestore → `DATA-MODEL.md` **et** `firestore.rules` ; une nouvelle route → `ROUTING.md` ; une clé de traduction → les quatre fichiers `src/assets/i18n/*.json` (le contrôle `npm run check:i18n` échoue sinon).
