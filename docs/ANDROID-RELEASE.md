# Android et publication

Application Capacitor 8 : `appId` `fr.nikho.vinum`, nom « Vinum », `webDir` `www`. Versions Android (`android/variables.gradle`) : `minSdk` 24 (Android 7.0), `compileSdk` et `targetSdk` 36.

## Prérequis

- Node.js 20.19+ ou 22.12+, npm 10+
- Android Studio (SDK 36 et JDK fournis par Android Studio)
- Fichier `android/app/google-services.json` (voir [Sécurité](SECURITY.md#mise-en-place-dun-nouveau-projet))

## Cycle de développement

```bash
npm ci
npm run build:prod        # compile l'application web dans www/
npx cap sync android      # copie www/ et met à jour les plugins natifs
npx cap open android      # ouvre Android Studio
```

Raccourci : `npm run android:sync` enchaîne les deux premières étapes. **Toute modification du code web exige de relancer le build puis `cap sync`** pour apparaître sur l'appareil.

Pour déboguer la WebView : Chrome → `chrome://inspect` avec l'appareil connecté en USB.

## Signature de la version de production

### 1. Créer la clé (une seule fois)

```bash
keytool -genkeypair -v -keystore vinum-release.jks -alias vinum \
        -keyalg RSA -keysize 2048 -validity 10000
```

Placer `vinum-release.jks` dans `android/` (ou ailleurs ; le chemin est relatif à `android/`). **Sauvegarder le fichier et ses mots de passe dans un gestionnaire de secrets** : sans eux, aucune mise à jour future n'est possible (sauf Play App Signing, ci-dessous).

### 2. Déclarer les identifiants

```bash
cp android/keystore.properties.example android/keystore.properties
# puis renseigner storeFile, storePassword, keyAlias, keyPassword
```

`keystore.properties`, `*.jks` et `*.keystore` sont ignorés par Git (racine et `android/`). `android/app/build.gradle` lit ce fichier ; **s'il est absent, le build release n'est simplement pas signé** (utile en CI de vérification).

### 3. Empreintes pour Firebase / Google

Enregistrer dans la console Firebase les empreintes SHA-1 et SHA-256 :

```bash
keytool -list -v -keystore android/vinum-release.jks -alias vinum
```

Sans cela, la **connexion Google échoue** en version release. Si vous activez *Play App Signing*, ajoutez aussi les empreintes de la clé de signature d'application affichées dans la Play Console.

### 4. Construire l'App Bundle

Sous Windows (PowerShell) :

```powershell
cd android
.\gradlew.bat bundleRelease
```

Sous macOS/Linux : `./gradlew bundleRelease`. Résultat : `android/app/build/outputs/bundle/release/app-release.aab`, à envoyer dans la Play Console. Pour un APK de test : `assembleRelease`.

## Versions

Deux numéros sont à incrémenter à chaque publication, dans `android/app/build.gradle` :

| Champ | Règle |
|---|---|
| `versionCode` | Entier **strictement croissant** à chaque envoi au Play Store (actuellement `1`) |
| `versionName` | Version affichée (`1.0.0`, suivre `package.json`) |

## Choix de configuration

| Sujet | Choix | Pourquoi |
|---|---|---|
| `allowBackup` | `false` | Évite de restaurer sur un autre appareil une session Firebase ou un cache local incohérents |
| `minifyEnabled` | `false` | Le code applicatif est du JavaScript, déjà minifié par Angular. R8 ne porterait que sur le code natif des plugins ; l'activer exige des règles ProGuard à valider sur appareil pour chaque plugin Capacitor. À envisager seulement avec un test complet de la version release |
| `skipNativeAuth` | `true` | Le plugin natif ne sert qu'à obtenir le jeton Google ; une seule session Firebase (SDK JS) |
| Orientation | non verrouillée | Voir `AndroidManifest.xml` si un verrou portrait est souhaité |

## Liste de contrôle avant publication

- [ ] `npm run check` passe (traductions, icônes, lint, tests)
- [ ] `npm run build:prod` sans avertissement de budget
- [ ] Règles Firestore testées dans l'émulateur puis déployées ([Sécurité](SECURITY.md))
- [ ] Clé d'API restreinte et connexion retestée ([Sécurité](SECURITY.md#durcissement-recommandé-de-la-clé-dapi))
- [ ] `versionCode` incrémenté
- [ ] Empreintes SHA-1/SHA-256 de la clé **release** enregistrées dans Firebase
- [ ] Test sur appareil réel de la **version release** : inscription, connexion e-mail, connexion Google, ajout/retrait de bouteille, redimensionnement, changement de langue et de thème, mode avion, suppression de compte
- [ ] Fiche Play Store : politique de confidentialité (données collectées : e-mail, nom, contenu de cave), formulaire « Sécurité des données », captures d'écran, déclaration de suppression de compte (la suppression est disponible dans Réglages → Informations personnelles)

## Problèmes courants

| Symptôme | Cause probable |
|---|---|
| Connexion Google : « 10 » / `DEVELOPER_ERROR` | SHA-1 de la clé utilisée absent de Firebase, ou `google-services.json` périmé après ajout d'empreinte |
| Écran blanc au démarrage | `www/` absent ou périmé : relancer `npm run build:prod` puis `npx cap sync android` |
| Les traductions n'apparaissent pas | Fichiers `assets/i18n/*.json` non copiés : vérifier `www/assets/i18n/` après le build |
| Build Gradle : « SDK location not found » | Définir `sdk.dir` dans `android/local.properties` (fichier ignoré par Git) |
