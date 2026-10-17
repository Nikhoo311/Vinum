export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyDTrKRK2WQge9sDdaZ_l_Pdv8A7HgKwkO0",
    authDomain: "remember-me-e9313.firebaseapp.com",
    projectId: "remember-me-e9313",
    storageBucket: "remember-me-e9313.firebasestorage.app",
    messagingSenderId: "161787533144",
    appId: "1:161787533144:web:e24462b05a7a144287772d"
  },
  /**
   * Fonctionnalités en cours de développement, masquées en production.
   * - catalogue : onglet « Catalogue » et carte « Liste de souhaits » de l'accueil.
   * - maturityAlerts : alertes de maturité (notifications locales ; nécessite @capacitor/local-notifications).
   */
  features: {
    catalogue: true,
    maturityAlerts: true,
  },
};
