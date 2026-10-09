import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithCredential, GoogleAuthProvider, signOut, onAuthStateChanged,
  User as FirebaseUser, sendPasswordResetEmail,
  EmailAuthProvider, reauthenticateWithCredential,
  updatePassword as fbUpdatePassword, verifyBeforeUpdateEmail,
  deleteUser, browserLocalPersistence, setPersistence
} from '@angular/fire/auth';
import { BehaviorSubject, filter, firstValueFrom, take } from 'rxjs';
import { CaveView, User } from '../models/user.model';
import { ERRORS_CODES } from '../types/ErrorsCode';
import { doc, Firestore, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from '@angular/fire/firestore';
import { WineType } from '../types/WineType';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private authReadySubject = new BehaviorSubject(false);

  constructor(private auth: Auth, private router: Router, private firestore: Firestore) {
    void this.initializeAuthState();
  }
 
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get currentUser$() {
    return this.currentUserSubject.asObservable();
  }

  async waitUntilReady(): Promise<User | null> {
    if (!this.authReadySubject.value) {
      await firstValueFrom(this.authReadySubject.pipe(filter(Boolean), take(1)));
    }

    return this.currentUser;
  }
 
  // ── Authentification ──────────────────────────────────────
 
  register(email: string, password: string): Promise<User> {
    return createUserWithEmailAndPassword(this.auth, email, password)
      .then(({ user }) => {
        const mappedUser = this.mapFirebaseUser(user);
        this.currentUserSubject.next(mappedUser);
        this.router.navigate(['/preference']);
        return mappedUser;
      })
      .catch((error) => this.handleAuthError(error));
  }
 
  login(email: string, password: string): Promise<void> {
    return signInWithEmailAndPassword(this.auth, email, password)
      .then(({ user }) => this.handleAuthSuccess(user))
      .catch((error) => this.handleAuthError(error));
  }
 
  loginWithGoogle(): Promise<void> {
    return FirebaseAuthentication.signInWithGoogle()
      .then((result) => {
        const credential = GoogleAuthProvider.credential(result.credential?.idToken);
        return signInWithCredential(this.auth, credential);
      })
      .then(({ user }) => this.handleAuthSuccess(user))
      .catch((error) => this.handleAuthError(error));
  }
 
  logout(): Promise<void> {
    return signOut(this.auth)
      .then(() => FirebaseAuthentication.signOut())
      .then(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/auth']);
      })
      .catch((error) => this.handleAuthError(error));
  }
 
  sendPasswordResetEmail(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email)
      .catch((error) => this.handleAuthError(error));
  }
 
  saveUserPreferences(user: User): Promise<void> {
    const userRef = doc(this.firestore, `users/${user.id}`);
    return setDoc(userRef, { ...user, createdAt: user.createdAt.toISOString() }, { merge: true })
      .then(() => {
        this.currentUserSubject.next(user);
      })
      .catch((error) => this.handleAuthError(error));
  }
 
  async updatePersonalInfo(
    data: { firstName: string; lastName: string; email: string },
    currentPassword?: string
  ): Promise<void> {
    const user = this.currentUser;
    const firebaseUser = this.auth.currentUser;
    if (!user || !user.id || !firebaseUser) {
      throw new Error('Utilisateur non connecté.');
    }
 
    const emailChanged = data.email !== user.email;
 
    if (emailChanged) {
      if (!currentPassword || !firebaseUser.email) {
        throw new Error("SETTINGS.INFO_PERSONAL.REQUIRED_PASSWORD_UPDATE_EMAIL_ERROR");
      }
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential)
        .then(() => verifyBeforeUpdateEmail(firebaseUser, data.email))
        .catch((error) => this.handleAuthError(error));
    }
 
    const userRef = doc(this.firestore, 'users', user.id);
    await updateDoc(userRef, { firstName: data.firstName, lastName: data.lastName })
      .catch((error) => this.handleAuthError(error));

    this.currentUserSubject.next({ ...user, firstName: data.firstName, lastName: data.lastName });
  }
 
  updatePassword(oldPassword: string, newPassword: string): Promise<void> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) {
      return Promise.reject(new Error('Utilisateur non connecté.'));
    }
 
    const credential = EmailAuthProvider.credential(firebaseUser.email, oldPassword);
 
    return reauthenticateWithCredential(firebaseUser, credential)
      .then(() => fbUpdatePassword(firebaseUser, newPassword))
      .catch((error) => this.handleAuthError(error));
  }
 
  updateFavoriteWine(selectedType: WineType): Promise<void> {
    const user = this.currentUser;
    if (!user || !user.id) {
      return Promise.reject(new Error('Utilisateur non connecté.'));
    }
 
    const userRef = doc(this.firestore, 'users', user.id);
    return updateDoc(userRef, { favoriteWineType: selectedType })
      .then(() => {
        this.currentUserSubject.next({ ...user, favoriteWineType: selectedType });
      })
      .catch((error) => this.handleAuthError(error));
  }

  updateCaveConfig(config: { rows?: number; cols?: number; viewMode?: CaveView }): Promise<void> {
    const user = this.currentUser;
    if (!user || !user.id) {
      return Promise.reject(new Error('Utilisateur non connecté.'));
    }

    const userRef = doc(this.firestore, 'users', user.id);
    return updateDoc(userRef, { caveConfig: { ...user.caveConfig, ...config } })
      .then(() => {
        this.currentUserSubject.next({
          ...user,
          caveConfig: { ...user.caveConfig, ...config },
        });
      })
      .catch((error) => this.handleAuthError(error));
  }
 
  async deleteAccount(password?: string): Promise<void> {
    const user = this.currentUser;
    const firebaseUser = this.auth.currentUser;
    if (!user || !user.id || !firebaseUser) {
      throw new Error('Utilisateur non connecté.');
    }
 
    if (user.provider === 'google') {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const credential = GoogleAuthProvider.credential(result.credential?.idToken);
      await reauthenticateWithCredential(firebaseUser, credential)
        .catch((error) => this.handleAuthError(error));
    } else {
      if (!password) throw new Error('SETTINGS.INFO_PERSONAL.REQUIRED_PASSWORD_DELETE_ERROR');
      const credential = EmailAuthProvider.credential(firebaseUser.email!, password);
      await reauthenticateWithCredential(firebaseUser, credential)
        .catch((error) => this.handleAuthError(error));
    }
 
    await this.deleteWineSubcollection(user.id).catch((error) => this.handleAuthError(error));
    await deleteDoc(doc(this.firestore, 'users', user.id)).catch((error) => this.handleAuthError(error));
    await deleteUser(firebaseUser).catch((error) => this.handleAuthError(error));
 
    this.currentUserSubject.next(null);
  }
 
  // ── Internes ───────────────────────────────────────────────

  private async deleteWineSubcollection(userId: string): Promise<void> {
    const wineRef = collection(this.firestore, `users/${userId}/wine`);
    const snapshot = await getDocs(wineRef);

    if (snapshot.empty) return;
    const batchSize = 500;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(this.firestore);
      const chunk = docs.slice(i, i + batchSize);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  private async initializeAuthState(): Promise<void> {
    try {
      await setPersistence(this.auth, browserLocalPersistence);
    } catch (error) {
      console.warn('Impossible de configurer la persistance locale Firebase.', error);
    }

    onAuthStateChanged(this.auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          await this.syncUserFromFirestore(firebaseUser);
        } else {
          this.currentUserSubject.next(null);
        }
      } catch (error) {
        console.error('Erreur de synchronisation utilisateur :', error);
        this.currentUserSubject.next(null);
      } finally {
        this.authReadySubject.next(true);
      }
    });
  }
 
  private handleAuthSuccess(firebaseUser: FirebaseUser): Promise<void> {
    return this.syncUserFromFirestore(firebaseUser).then((user) => {
      const isSetupDone = user.caveConfig?.rows > 0;
      this.router.navigate([!isSetupDone ? '/preference' : '/home']);
    });
  }

  private async syncUserFromFirestore(firebaseUser: FirebaseUser): Promise<User> {
    await firebaseUser.reload();
    const freshEmail = this.auth.currentUser?.email ?? firebaseUser.email;
 
    const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
    const snap = await getDoc(userRef);
    let user = snap.exists() ? (snap.data() as User) : this.mapFirebaseUser(firebaseUser);
 
    if (freshEmail && user.email !== freshEmail) {
      user = { ...user, email: freshEmail };
      await updateDoc(userRef, { email: freshEmail });
    }
 
    this.currentUserSubject.next(user);
    return user;
  }
 
  private mapFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email ?? '',
      firstName: '',
      lastName: '',
      favoriteWineType: null,
      provider: firebaseUser.providerData.some(p => p.providerId === 'google.com') ? 'google' : 'password',
      createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
      caveConfig: { rows: 0, cols: 0, viewMode: 'grid' },
    };
  }

  private handleAuthError(error: any): never {
    if (error.code === ERRORS_CODES.auth.userNotFound) throw new Error('AUTH.NO_ACCOUNT');
    if (error.code === ERRORS_CODES.auth.tooManyRequests) throw new Error('AUTH.TOO_MANY_ATTEMPTS');
    if (error.code === ERRORS_CODES.auth.invalidCredential) throw new Error('AUTH.INVALID_CREDENTIAL');
    if (error.code === ERRORS_CODES.auth.emailAlreadyInUse) throw new Error('AUTH.RULES.EMAIL_ALREADY_TAKEN');
    throw error;
  }
}