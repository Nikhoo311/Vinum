import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { User } from '../core/models/user.model';
import { authGuard, guestGuard, setupGuard } from './auth.guard';

const READY_USER: User = {
  id: 'uid-1',
  email: 'camille@example.com',
  firstName: 'Camille',
  lastName: 'Dubois',
  favoriteWineType: 'red',
  provider: 'password',
  createdAt: '2024-01-01T00:00:00.000Z',
  caveConfig: { rows: 3, cols: 4, viewMode: 'grid' },
};

const NEW_USER: User = { ...READY_USER, caveConfig: { rows: 0, cols: 0, viewMode: 'grid' } };

describe('guards d\'authentification', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  /** Les guards redirigent via `createUrlTree` : on le remplace par une simple trace de l'URL demandée. */
  function configure(user: User | null): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { waitUntilReady: () => Promise.resolve(user) } },
        { provide: Router, useValue: { createUrlTree: (commands: string[]) => ({ redirect: commands[0] }) } },
      ],
    });
  }

  async function run(guard: typeof authGuard): Promise<boolean | string> {
    const result = await TestBed.runInInjectionContext(() => guard(route, state));
    return typeof result === 'boolean' ? result : (result as unknown as { redirect: string }).redirect;
  }

  it('authGuard laisse passer un utilisateur connecté et renvoie un visiteur vers /auth', async () => {
    configure(NEW_USER);
    expect(await run(authGuard)).toBeTrue();

    TestBed.resetTestingModule();
    configure(null);
    expect(await run(authGuard)).toBe('/auth');
  });

  it('setupGuard exige un onboarding terminé', async () => {
    configure(READY_USER);
    expect(await run(setupGuard)).toBeTrue();

    TestBed.resetTestingModule();
    configure(NEW_USER);
    expect(await run(setupGuard)).toBe('/preference');

    TestBed.resetTestingModule();
    configure(null);
    expect(await run(setupGuard)).toBe('/auth');
  });

  it('guestGuard réserve la page de connexion aux visiteurs', async () => {
    configure(null);
    expect(await run(guestGuard)).toBeTrue();

    TestBed.resetTestingModule();
    configure(READY_USER);
    expect(await run(guestGuard)).toBe('/home');

    TestBed.resetTestingModule();
    configure(NEW_USER);
    expect(await run(guestGuard)).toBe('/preference');
  });
});
