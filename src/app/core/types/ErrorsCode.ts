/** Codes d'erreur Firebase Auth gérés explicitement par l'application. */
export const ERRORS_CODES = {
  auth: {
    emailAlreadyInUse: 'auth/email-already-in-use',
    userNotFound: 'auth/user-not-found',
    tooManyRequests: 'auth/too-many-requests',
    invalidCredential: 'auth/invalid-credential',
    wrongPassword: 'auth/wrong-password',
    weakPassword: 'auth/weak-password',
    invalidEmail: 'auth/invalid-email',
    userDisabled: 'auth/user-disabled',
    networkRequestFailed: 'auth/network-request-failed',
    requiresRecentLogin: 'auth/requires-recent-login',
    popupClosedByUser: 'auth/popup-closed-by-user',
    cancelledPopupRequest: 'auth/cancelled-popup-request',
  },
} as const;
