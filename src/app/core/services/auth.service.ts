import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  Auth,
  EmailAuthProvider,
  GoogleAuthProvider,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as firebaseUpdatePassword,
  verifyBeforeUpdateEmail,
} from '@angular/fire/auth';
import { browserLocalPersistence, setPersistence } from 'firebase/auth';
import {
  DocumentReference,
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from '@angular/fire/firestore';
import { BehaviorSubject, filter, firstValueFrom, take } from 'rxjs';

import { CaveConfig, CaveView, EMPTY_CAVE_CONFIG, User } from '../models/user.model';
import { WineType } from '../types/WineType';
import { AppError, ERROR_KEYS } from '../utils/error.util';
import { hasCompletedSetup, normalizeUser } from '../utils/user.util';
import { omitUndefined } from '../utils/wine.util';

/** Taille maximale d'un lot d'écritures Firestore. */
const FIRESTORE_BATCH_LIMIT = 500;

/**
 * Authentification (Firebase Auth) et profil utilisateur (Firestore `users/{uid}`).
 *
 * Les méthodes ne traduisent pas les erreurs : elles lèvent l'erreur d'origine ou une
 * {@link AppError}. C'est à l'interface de la convertir avec `toErrorKey`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly router = inject(Router);

  private readonly userSubject = new BehaviorSubject<User | null>(null);
  private readonly readySubject = new BehaviorSubject<boolean>(false);

  /** Utilisateur courant (`null` si déconnecté ou profil indisponible). */
  readonly currentUser$ = this.userSubject.asObservable();

  constructor() {
    void this.initializeAuthState();
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  /** Attend la première résolution de l'état d'authentification (session restaurée ou non). */
  async waitUntilReady(): Promise<User | null> {
    if (!this.readySubject.value) {
      await firstValueFrom(this.readySubject.pipe(filter(Boolean), take(1)));
    }
    return this.currentUser;
  }

  // ── Authentification ──────────────────────────────────────

  async register(email: string, password: string): Promise<User> {
    const { user } = await createUserWithEmailAndPassword(this.auth, email, password);
    const mappedUser = this.mapFirebaseUser(user);
    this.userSubject.next(mappedUser);
    await this.router.navigateByUrl('/preference', { replaceUrl: true });
    return mappedUser;
  }

  async login(email: string, password: string): Promise<void> {
    const { user } = await signInWithEmailAndPassword(this.auth, email, password);
    await this.handleAuthSuccess(user);
  }

  async loginWithGoogle(): Promise<void> {
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) throw new AppError('AUTH.GOOGLE_ERROR');

    const credential = GoogleAuthProvider.credential(idToken);
    const { user } = await signInWithCredential(this.auth, credential);
    await this.handleAuthSuccess(user);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    await this.signOutNative();
    this.userSubject.next(null);
    await this.router.navigateByUrl('/auth', { replaceUrl: true });
  }

  sendPasswordResetEmail(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  // ── Profil ────────────────────────────────────────────────

  /** Enregistre (ou complète) le profil complet, typiquement à la fin de l'onboarding. */
  async saveUserPreferences(user: User): Promise<void> {
    const userRef = doc(this.firestore, 'users', user.id);
    await setDoc(userRef, omitUndefined({ ...user }), { merge: true });
    this.userSubject.next(user);
  }

  /** Met à jour l'utilisateur en mémoire uniquement (après une écriture déjà faite ailleurs). */
  patchLocalUser(patch: Partial<Omit<User, 'id'>>): void {
    const user = this.currentUser;
    if (user) this.userSubject.next({ ...user, ...patch });
  }

  async updatePersonalInfo(
    data: { firstName: string; lastName: string; email: string },
    currentPassword?: string
  ): Promise<void> {
    const { user, firebaseUser } = this.requireSession();

    if (data.email !== user.email) {
      if (!currentPassword || !firebaseUser.email) {
        throw new AppError('SETTINGS.INFO_PERSONAL.REQUIRED_PASSWORD_UPDATE_EMAIL_ERROR');
      }
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await verifyBeforeUpdateEmail(firebaseUser, data.email);
    }

    const userRef = doc(this.firestore, 'users', user.id);
    await updateDoc(userRef, { firstName: data.firstName, lastName: data.lastName });
    this.patchLocalUser({ firstName: data.firstName, lastName: data.lastName });
  }

  async updatePassword(oldPassword: string, newPassword: string): Promise<void> {
    const { user, firebaseUser } = this.requireSession();
    if (user.provider === 'google' || !firebaseUser.email) {
      throw new AppError('SETTINGS.CHANGE_PASSWORD.ERROR');
    }

    const credential = EmailAuthProvider.credential(firebaseUser.email, oldPassword);
    await reauthenticateWithCredential(firebaseUser, credential);
    await firebaseUpdatePassword(firebaseUser, newPassword);
  }

  async updateFavoriteWine(selectedType: WineType): Promise<void> {
    const { user } = this.requireSession();
    const userRef = doc(this.firestore, 'users', user.id);
    await updateDoc(userRef, { favoriteWineType: selectedType });
    this.patchLocalUser({ favoriteWineType: selectedType });
  }

  async updateCaveConfig(config: { rows?: number; cols?: number; viewMode?: CaveView }): Promise<void> {
    const { user } = this.requireSession();
    const caveConfig: CaveConfig = { ...user.caveConfig, ...omitUndefined(config) };
    const userRef = doc(this.firestore, 'users', user.id);
    await updateDoc(userRef, { caveConfig });
    this.patchLocalUser({ caveConfig });
  }

  /**
   * Supprime définitivement le compte : ré-authentification, suppression des vins, du profil
   * puis du compte Firebase Auth.
   * @param password Mot de passe actuel (comptes e-mail uniquement).
   */
  async deleteAccount(password?: string): Promise<void> {
    const { user, firebaseUser } = this.requireSession();

    if (user.provider === 'google') {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (!idToken) throw new AppError('AUTH.GOOGLE_ERROR');
      await reauthenticateWithCredential(firebaseUser, GoogleAuthProvider.credential(idToken));
    } else {
      if (!password || !firebaseUser.email) {
        throw new AppError('SETTINGS.INFO_PERSONAL.REQUIRED_PASSWORD_DELETE_ERROR');
      }
      await reauthenticateWithCredential(firebaseUser, EmailAuthProvider.credential(firebaseUser.email, password));
    }

    await this.deleteWineSubcollection(user.id);
    await deleteDoc(doc(this.firestore, 'users', user.id));
    await deleteUser(firebaseUser);
    await this.signOutNative();

    this.userSubject.next(null);
  }

  // ── Internes ──────────────────────────────────────────────

  private requireSession(): { user: User; firebaseUser: FirebaseUser } {
    const user = this.currentUser;
    const firebaseUser = this.auth.currentUser;
    if (!user || !firebaseUser) throw new AppError(ERROR_KEYS.notAuthenticated);
    return { user, firebaseUser };
  }

  private async signOutNative(): Promise<void> {
    try {
      await FirebaseAuthentication.signOut();
    } catch {
      // Aucune session native à fermer (connexion par e-mail, navigateur…) : sans conséquence.
    }
  }

  private async deleteWineSubcollection(userId: string): Promise<void> {
    const snapshot = await getDocs(collection(this.firestore, 'users', userId, 'wine'));

    for (let start = 0; start < snapshot.docs.length; start += FIRESTORE_BATCH_LIMIT) {
      const batch = writeBatch(this.firestore);
      snapshot.docs.slice(start, start + FIRESTORE_BATCH_LIMIT).forEach((entry) => batch.delete(entry.ref));
      await batch.commit();
    }
  }

  private async initializeAuthState(): Promise<void> {
    try {
      await setPersistence(this.auth, browserLocalPersistence);
    } catch (error) {
      console.warn('Impossible de configurer la persistance locale Firebase.', error);
    }

    onAuthStateChanged(this.auth, (firebaseUser) => void this.onAuthStateChange(firebaseUser));
  }

  private async onAuthStateChange(firebaseUser: FirebaseUser | null): Promise<void> {
    try {
      if (firebaseUser) {
        await this.syncUserFromFirestore(firebaseUser);
      } else {
        this.userSubject.next(null);
      }
    } catch (error) {
      console.error('Erreur de synchronisation du profil utilisateur :', error);
      this.userSubject.next(null);
    } finally {
      this.readySubject.next(true);
    }
  }

  private async handleAuthSuccess(firebaseUser: FirebaseUser): Promise<void> {
    const user = await this.syncUserFromFirestore(firebaseUser);
    await this.router.navigateByUrl(hasCompletedSetup(user) ? '/home' : '/preference', { replaceUrl: true });
  }

  /** Lit le profil Firestore ; hors ligne, retombe sur le cache local s'il existe. */
  private async readUserDoc(userRef: DocumentReference) {
    try {
      return await getDoc(userRef);
    } catch (error) {
      try {
        return await getDocFromCache(userRef);
      } catch {
        throw error;
      }
    }
  }

  private async syncUserFromFirestore(firebaseUser: FirebaseUser): Promise<User> {
    try {
      await firebaseUser.reload();
    } catch {
      // Hors ligne : on continue avec les informations déjà connues du compte.
    }

    const base = this.mapFirebaseUser(this.auth.currentUser ?? firebaseUser);
    const userRef = doc(this.firestore, 'users', firebaseUser.uid);
    const snapshot = await this.readUserDoc(userRef);

    let user = snapshot.exists() ? normalizeUser(snapshot.data(), base) : base;

    // L'adresse du compte Auth fait foi (elle change après validation d'un nouvel e-mail).
    if (snapshot.exists() && base.email && user.email !== base.email) {
      user = { ...user, email: base.email };
      void updateDoc(userRef, { email: base.email }).catch(() => undefined);
    }

    this.userSubject.next(user);
    return user;
  }

  private mapFirebaseUser(firebaseUser: FirebaseUser): User {
    const created = new Date(firebaseUser.metadata.creationTime ?? Date.now());

    return {
      id: firebaseUser.uid,
      email: firebaseUser.email ?? '',
      firstName: '',
      lastName: '',
      favoriteWineType: null,
      provider: firebaseUser.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'password',
      createdAt: (Number.isNaN(created.getTime()) ? new Date() : created).toISOString(),
      caveConfig: { ...EMPTY_CAVE_CONFIG },
    };
  }
}
