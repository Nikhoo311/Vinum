import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.nikho.vinum',
  appName: 'Vinum',
  webDir: 'www',
  plugins: {
    FirebaseAuthentication: {
      // L'authentification native n'est utilisée que pour obtenir l'idToken Google ;
      // la session est ensuite portée par le SDK Firebase JS (voir AuthService).
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
};

export default config;
