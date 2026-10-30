import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { CatalogueService } from '../core/services/catalogue.service';
import { hasCompletedSetup } from '../core/utils/user.util';

/**
 * Exige un utilisateur connecté (peu importe l'avancement de l'onboarding).
 * Utilisé pour la page d'onboarding elle-même.
 */
export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const user = await inject(AuthService).waitUntilReady();

  return user ? true : router.createUrlTree(['/auth']);
};

/**
 * Exige un utilisateur connecté dont l'onboarding est terminé.
 * Un compte tout juste créé est renvoyé vers `/preference` pour configurer sa cave.
 */
export const setupGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const user = await inject(AuthService).waitUntilReady();

  if (!user) return router.createUrlTree(['/auth']);
  return hasCompletedSetup(user) ? true : router.createUrlTree(['/preference']);
};

/** Réservé aux visiteurs : un utilisateur déjà connecté est renvoyé vers l'application. */
export const guestGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const user = await inject(AuthService).waitUntilReady();

  if (!user) return true;
  return router.createUrlTree([hasCompletedSetup(user) ? '/home' : '/preference']);
};

/** Réserve l'interface de modération aux administrateurs de la collection `admins`. */
export const catalogueAdminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const catalogue = inject(CatalogueService);
  const user = await auth.waitUntilReady();
  if (!user) return router.createUrlTree(['/auth']);

  const isAdmin = await firstValueFrom(catalogue.isAdmin$);
  return isAdmin ? true : router.createUrlTree(['/settings']);
};
