import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { UserWine } from '../models/wine.model';
import { Firestore, collection, doc, setDoc, updateDoc, deleteDoc, collectionData } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { BehaviorSubject, Observable, Subscription, of, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CaveSlot {
  row: number;
  col: number;
  wine: UserWine | null;
}

@Injectable({
  providedIn: 'root'
})
export class CaveService {
  private caveSubject = new BehaviorSubject<UserWine[]>([]);
  private firestoreSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private firestore: Firestore,
    private fbAuth: Auth
  ) {
    onAuthStateChanged(this.fbAuth, (firebaseUser) => {
      if (firebaseUser) {
        const wineCollectionRef = collection(this.firestore, 'users', firebaseUser.uid, 'wine');
        this.firestoreSubscription?.unsubscribe();
        this.firestoreSubscription = collectionData(wineCollectionRef, { idField: 'id' }).subscribe((wines) => {
          this.caveSubject.next(wines as UserWine[]);
        });
      } else {
        this.firestoreSubscription?.unsubscribe();
        this.caveSubject.next([]);
      }
    });
  }

  getWines(): Observable<UserWine[]> {
    const user = this.authService.currentUser;
    if (!user || !user.id) {
      return of([]);
    }

    const wineCollection = collection(this.firestore, 'users', user.id, 'wine');

    return collectionData(wineCollection, { idField: 'id' }).pipe(
      map((wines: any[]) => wines.sort((a, b) => a.name.localeCompare(b.name)))
    ) as Observable<UserWine[]>;
  }

  async addWine(wine: Omit<UserWine, 'id'>): Promise<void> {
    const user = this.authService.currentUser;
    if (!user || !user.id) throw new Error("Utilisateur non connecté.");

    const existingWine = this.cave.find(w =>
      w.name === wine.name &&
      w.domain === wine.domain &&
      w.vintage === wine.vintage &&
      w.appellation === wine.appellation
    );

    if (existingWine && existingWine.id) {
      const updatedPlacements = [...(existingWine.placements || []), ...(wine.placements || [])];
      const wineRef = doc(this.firestore, 'users', user.id, 'wine', existingWine.id);
      await updateDoc(wineRef, { placements: updatedPlacements });
      this.caveSubject.next(this.cave.map(w => w.id === existingWine.id ? { ...w, placements: updatedPlacements } : w));
    } else {
      const wineCollectionRef = collection(this.firestore, 'users', user.id, 'wine');
      const newDocRef = doc(wineCollectionRef);
      const wineWithId = this.removeUndefinedFields<UserWine>({ ...wine, id: newDocRef.id });
      await setDoc(newDocRef, wineWithId);
      this.caveSubject.next([...this.cave, wineWithId]);
    }
  }

  async updateWine(wine: UserWine): Promise<void> {
    const user = this.authService.currentUser;
    if (!user || !user.id) throw new Error("Utilisateur non connecté.");
    if (!wine.id) throw new Error("L'ID du vin est manquant pour la mise à jour.");

    const wineRef = doc(this.firestore, 'users', user.id, 'wine', wine.id);
    await updateDoc(wineRef, { ...wine });
    this.caveSubject.next(this.cave.map(w => w.id === wine.id ? wine : w));
  }

  async deleteWine(wineId: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user || !user.id) throw new Error("Utilisateur non connecté.");
    if (!wineId) throw new Error("L'ID du vin est manquant pour la suppression.");

    const wineRef = doc(this.firestore, 'users', user.id, 'wine', wineId);
    await deleteDoc(wineRef);
    this.caveSubject.next(this.cave.filter(w => w.id !== wineId));
  }

  async removeBottle(wineId: string, placementToRemove: { row: number; col: number }): Promise<void> {
    const user = this.authService.currentUser;
    if (!user || !user.id) throw new Error("Utilisateur non connecté.");
    if (!wineId) throw new Error("L'ID du vin est manquant pour la suppression de placement.");

    const wineRef = doc(this.firestore, 'users', user.id, 'wine', wineId);
    const currentWine = this.cave.find(wine => wine.id === wineId);
    if (!currentWine) throw new Error("Vin non trouvé.");
    if (!currentWine.placements) throw new Error("Aucun placement trouvé pour ce vin.");

    const updatedPlacements = currentWine.placements.filter(placement =>
      !(placement.row === placementToRemove.row && placement.col === placementToRemove.col)
    );

    if (updatedPlacements.length === 0) {
      await this.deleteWine(wineId);
    } else {
      await updateDoc(wineRef, { placements: updatedPlacements });
      this.caveSubject.next(this.cave.map(w => 
        w.id === wineId ? { ...w, placements: updatedPlacements } : w
      ));
    }
  }

  async pruneOutOfBoundsPlacements(rows: number, cols: number): Promise<void> {
    const user = this.authService.currentUser;
    if (!user || !user.id) throw new Error("Utilisateur non connecté.");

    const winesToUpdate: { wineId: string; keptPlacements: { row: number; col: number }[] }[] = [];

    for (const wine of this.cave) {
      const placements = wine.placements ?? [];
      const keptPlacements = placements.filter(p => p.row < rows && p.col < cols);

      if (keptPlacements.length !== placements.length) {
        winesToUpdate.push({ wineId: wine.id || '', keptPlacements });
      }
    }

    if (winesToUpdate.length === 0) return;

    await Promise.all(
      winesToUpdate.map(({ wineId, keptPlacements }) => {
        const wineRef = doc(this.firestore, 'users', user.id!, 'wine', wineId);
        return keptPlacements.length === 0
          ? deleteDoc(wineRef)
          : updateDoc(wineRef, { placements: keptPlacements });
      })
    );
  }

  get cave(): UserWine[] {
    return this.caveSubject.value;
  }

  get caveConfig() {
    return this.authService.currentUser?.caveConfig || { rows: 0, cols: 0, viewMode: 'grid' };
  }

  private removeUndefinedFields<T extends object>(data: T): T {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    ) as T;
  }

  private computeGrid(caveConfig: { rows: number; cols: number }, wines: UserWine[]): CaveSlot[] {
    const { rows, cols } = caveConfig;
    const placementMap = new Map<string, UserWine>();

    for (const wine of wines) {
      for (const placement of wine.placements ?? []) {
        placementMap.set(`${placement.row}-${placement.col}`, wine);
      }
    }

    const cells: CaveSlot[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cells.push({ row, col, wine: placementMap.get(`${row}-${col}`) ?? null });
      }
    }
    return cells;
  }

  get grid$(): Observable<CaveSlot[]> {
    return combineLatest([this.authService.currentUser$, this.caveSubject]).pipe(
      map(([user, wines]) => this.computeGrid(user?.caveConfig ?? { rows: 0, cols: 0, viewMode: 'grid' as const }, wines))
    );
  }

  get totalCapacity(): number {
    const { rows, cols } = this.caveConfig;
    return rows * cols;
  }

  get occupiedCount(): number {
    return this.cave.reduce((total, wine) => total + (wine.placements?.length ?? 0), 0);
  }

  get totalBottles(): number {
    return this.cave.reduce((total, wine) => total + wine.placements.length, 0);
  }

  get starWine(): UserWine {
    return this.cave.filter(wine => wine.unitPrice).sort((a, b) => b.unitPrice! - a.unitPrice!)[0];
  }

  getDistributionBy(property: keyof UserWine, possibleValues: string[] = []): Record<string, number> {
    const initialDist: Record<string, number> = possibleValues.reduce((acc, val) => {
      acc[val] = 0;
      return acc;
    }, {} as Record<string, number>);

    if (!this.cave || this.cave.length === 0) return initialDist;

    return this.cave.reduce((dist, wine) => {
      const val = wine[property];
      const key = (val != null) ? val.toString() : 'Inconnue';
      dist[key] = (dist[key] || 0) + (wine.placements?.length || 0);
      return dist;
    }, initialDist);
  }

  formatPlacementCoords(placement: { row: number, col: number }): string {
    if (!placement) return '';
    const letter = String.fromCharCode(65 + placement.row);
    const colNumber = placement.col + 1;
    
    return `${letter}${colNumber}`;
  }

  get totalValue(): number {
    return this.cave.reduce((total, wine) => {
      return total + (wine.unitPrice * wine.placements.length);
    }, 0);
  }

  get uniqueRegionsCount(): number {
    const regions = new Set(
      this.cave
        .map(wine => wine.region)
        .filter(region => !!region)
    );
    return regions.size;
  }

  get averageRating(): number {
    const ratedWines = this.cave.filter(wine => wine.rating !== undefined && wine.rating !== null);
    if (ratedWines.length === 0) return 0;
    const totalRating = ratedWines.reduce((sum, wine) => sum + wine.rating!, 0);
    return Math.round((totalRating / ratedWines.length) * 10) / 10;
  }

  get winesSortedByRatingDesc(): UserWine[] {
    return [...this.cave]
      .filter(wine => wine.rating !== undefined && wine.rating !== null)
      .sort((a, b) => b.rating! - a.rating!);
  }
}
