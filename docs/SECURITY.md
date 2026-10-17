# Sécurité et Firebase

## Modèle de menace en bref

Vinum stocke des données personnelles légères (nom, e-mail, contenu de cave). Il n'y a **pas de serveur applicatif** : la sécurité repose sur trois piliers — Firebase Authentication, les **règles Firestore**, et la restriction de la clé d'API Firebase.

## Configuration Firebase

Projet : `remember-me-e9313`. Voir `.firebaserc` et `src/environments/environment*.ts`.

### Mise en place d'un nouveau projet

1. [Console Firebase](https://console.firebase.google.com/) → créer le projet.
2. *Authentication* → méthodes de connexion : **E-mail/mot de passe** et **Google**.
3. *Firestore Database* → créer la base (mode production).
4. Renseigner la configuration web dans `src/environments/environment.ts` et `environment.prod.ts`.
5. Android : ajouter l'application `fr.nikho.vinum`, enregistrer l'empreinte **SHA-1** (et SHA-256) de la clé de signature (debug **et** release), télécharger `google-services.json` dans `android/app/`.
6. Déployer les règles (ci-dessous).

### Déployer les règles Firestore

```bash
npm install -g firebase-tools        # une fois
firebase login
firebase deploy --only firestore     # règles + index (firebase.json)
```

Les règles sont dans [`firestore.rules`](../firestore.rules). **Tester dans l'émulateur avant le premier déploiement** (`firebase emulators:start --only firestore`) : voir « Vérifications à faire » plus bas.

## Règles Firestore

Principe : *chacun ne voit et ne modifie que ses propres données ; tout le reste est refusé.*

| Chemin | Lecture / suppression | Création / modification |
|---|---|---|
| `users/{uid}` | propriétaire (`request.auth.uid == uid`) | propriétaire **et** contenu valide |
| `users/{uid}/wine/{wineId}` | propriétaire | propriétaire **et** contenu valide |
| tout autre chemin | refusé | refusé |

### Validations de contenu

Les règles bornent les champs critiques pour qu'un client modifié ne puisse pas stocker n'importe quoi :

- **Profil** : `firstName`/`lastName` ≤ 100 caractères, `email` ≤ 320 ; `caveConfig` avec `rows`, `cols` entiers entre 0 et 240, `rows × cols ≤ 240`, `viewMode` ∈ {`grid`,`list`}.
- **Vin** : `name` (1 à 200 caractères) et `type` ∈ {`red`,`white`,`rose`,`champagne`} **obligatoires** ; `ownerId` égal à l'uid s'il est présent ; textes bornés ; `vintage` et `peakMaturityYear` entre 0 et 3000 ; `unitPrice` entre 0 et 1 000 000 ; `rating` entre 0 et 5 ; `addedAt` ≤ 40 caractères ; `foodPairing` ≤ 50 éléments ; `placements` ≤ 240 éléments.

Ces validations sont **volontairement tolérantes** avec les champs facultatifs, afin de ne pas bloquer d'anciens documents.

### Limites des règles

- Elles ne peuvent pas garantir l'**unicité d'un emplacement** dans la cave (deux fiches pourraient revendiquer la même case) : la cohérence est assurée par le client. Voir [Limites connues](REVIEW.md#limites-connues).
- Elles ne vérifient pas que `rows × cols` correspond au nombre de bouteilles ; le redimensionnement passe par `resizeCave` (lot atomique).
- `CAVE_MAX` (24) est une règle de **produit** appliquée par l'interface ; le plafond technique des règles est 240 (`CAVE_MAX_PREMIUM`).

## Secrets et configuration publique

| Élément | Sensible ? | Explication |
|---|---|---|
| Clé d'API Firebase, `appId`, `projectId`… (`environment*.ts`, `google-services.json`) | **Non** | Ce sont des identifiants publics par conception : ils désignent le projet, ils n'ouvrent aucun accès. La protection vient des règles Firestore et de l'authentification |
| Keystore de signature Android (`*.jks`) et `keystore.properties` | **Oui** | Jamais dans Git (ignorés par `.gitignore`). Sauvegarde chiffrée obligatoire : sa perte empêche toute mise à jour de l'application sur le Play Store (hors *Play App Signing*) |
| Compte de service Firebase / clés d'administration | **Oui** | Aucun n'est utilisé ni nécessaire dans ce dépôt |

### Durcissement recommandé de la clé d'API

Dans la console Google Cloud → *APIs & Services* → *Credentials*, ouvrir la clé d'API Web du projet et :

1. **Restreindre aux applications** : pour la clé utilisée par l'application Android, restreindre à l'application Android `fr.nikho.vinum` + empreinte SHA-1 ;
2. **Restreindre aux API** : ne laisser que *Identity Toolkit API*, *Token Service API* et *Cloud Firestore API*.

> Attention : la même clé est utilisée par le SDK JavaScript dans la WebView. Une restriction « Android » seule peut bloquer l'application ; tester sur appareil après chaque changement, ou utiliser deux clés distinctes.

### Recommandations complémentaires

- **App Check** (Play Integrity) : empêche l'utilisation de votre backend par des clients qui ne sont pas votre application.
- **Protection contre l'énumération d'e-mails** : activer l'option dans *Authentication → Settings* (activée par défaut sur les projets récents). Sans elle, Firebase renvoie `auth/user-not-found`, que l'application traduit par « Aucun compte n'est associé à cet utilisateur » et qui révèle donc l'existence d'un compte ; avec elle, Firebase renvoie toujours `auth/invalid-credential` (« L'adresse e-mail ou le mot de passe est incorrect »).
- **Suppression des données à la suppression du compte** : l'application supprime elle-même le profil et les vins avant le compte Auth. L'extension Firebase « Delete User Data » peut servir de filet de sécurité (si l'application est interrompue entre deux étapes).
- **Alertes budgétaires** Google Cloud pour détecter une consommation anormale.

## Application Android

- `android:allowBackup="false"` : les données locales (session Firebase, cache Firestore) ne sont plus incluses dans les sauvegardes Android/Google Drive ni dans les transferts d'appareil. Une session restaurée sur un autre appareil serait incohérente.
- Seule la permission `INTERNET` est déclarée.
- `skipNativeAuth: true` (Capacitor Firebase Authentication) : le plugin natif ne crée pas sa propre session Firebase ; il sert uniquement à récupérer le jeton Google, la session unique étant portée par le SDK JS. Cela évite deux sessions divergentes.
- Aucun contenu distant n'est chargé dans la WebView, hormis les polices Google Fonts (voir [Revue](REVIEW.md#améliorations-recommandées-non-réalisées)).

## Traitement des erreurs

Les messages affichés sont traduits et génériques : les détails techniques (codes Firebase, trace) ne sont jamais montrés à l'utilisateur ; ils vont dans la console du développeur uniquement. Avec la protection contre l'énumération d'e-mails activée, les erreurs d'authentification ne révèlent pas si un compte existe.

## Vérifications à faire avant la mise en production

Ces points n'ont **pas pu être exécutés** dans l'environnement de la revue (pas d'accès réseau au registre npm ni à Firebase) :

- [ ] Tester `firestore.rules` dans l'émulateur : un utilisateur A ne peut ni lire ni écrire les données de B ; ajout, modification, notation, retrait de bouteille, redimensionnement et suppression de compte fonctionnent pour le propriétaire ; un document hors limites (`rating: 9`, `type: 'x'`…) est refusé.
- [ ] Vérifier sur appareil réel : connexion e-mail, connexion Google, déconnexion, suppression de compte.
- [ ] Vérifier le comportement hors ligne (mode avion) : consultation, ajout et retrait d'une bouteille, puis reconnexion.
- [ ] Appliquer les restrictions de clé d'API et retester la connexion.
