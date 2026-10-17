import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, setDoc, writeBatch } from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { CaveService } from './cave.service';
import { UserWine } from '../models/wine.model';
import { WineType } from '../types/WineType';
import { CatalogueWine, CatalogueWineData, CatalogueSort } from '../models/catalogue-wine.model';

@Injectable({ providedIn: 'root' })
export class CatalogueService {
  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private caveService: CaveService
  ) {}

  getPersonalWines(): Observable<CatalogueWine[]> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user?.id) return of([]);
        const catalogueRef = collection(this.firestore, 'users', user.id, 'catalogue');
        return collectionData(catalogueRef, { idField: 'id' }) as Observable<CatalogueWine[]>;
      })
    );
  }

  private get userId(): string {
    return this.authService.currentUser?.id ?? '';
  }

  loadWishlist(): Set<string> {
    try {
      const value = localStorage.getItem(`catalogue-wishlist-${this.userId}`);
      return new Set(value ? JSON.parse(value) : []);
    } catch {
      return new Set();
    }
  }

  saveWishlist(wishlist: Set<string>): void {
    if (this.userId) {
      localStorage.setItem(`catalogue-wishlist-${this.userId}`, JSON.stringify([...wishlist]));
    }
  }

  get freeSlots(): { row: number; col: number; label: string }[] {
    const { rows, cols } = this.caveService.caveConfig;
    const occupied = new Set(this.caveService.cave.flatMap(wine =>
      (wine.placements ?? []).map(placement => `${placement.row}-${placement.col}`)
    ));

    return Array.from({ length: rows * cols }, (_, index) => ({
      row: Math.floor(index / cols),
      col: index % cols,
    }))
      .filter(slot => !occupied.has(`${slot.row}-${slot.col}`))
      .map(slot => ({ ...slot, label: this.caveService.formatPlacementCoords(slot) }));
  }

  caveCount(wine: CatalogueWine): number {
    return this.caveService.cave
      .filter(item => item.wineCatalogueId === wine.id || (
        item.name === wine.name && item.domain === wine.domain && item.vintage === Number(wine.vintage)
      ))
      .reduce((count, item) => count + (item.placements?.length ?? 0), 0);
  }

  filterWines(wines: CatalogueWine[], query: string, types: Set<WineType>, region: string, wishlist: Set<string>, onlyWishlist: boolean, onlyInCave: boolean, sort: CatalogueSort): CatalogueWine[] {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const search = normalize(query);
    return wines.map(wine => ({ ...wine, inCave: this.caveCount(wine) > 0 })).filter(wine =>
      (!types.size || types.has(wine.type)) && (region === 'all' || wine.region === region) &&
      (!onlyWishlist || wishlist.has(wine.id)) && (!onlyInCave || wine.inCave) &&
      (!search || normalize([wine.name, wine.domain, wine.region, wine.grapeVariety, wine.vintage].join(' ')).includes(search))
    ).sort((a, b) => {
      if (sort === 'price-asc') return a.unitPrice - b.unitPrice;
      if (sort === 'price-desc') return b.unitPrice - a.unitPrice;
      if (sort === 'vintage-desc') return (Number(b.vintage) || 0) - (Number(a.vintage) || 0);
      return a.name.localeCompare(b.name, 'fr');
    });
  }

  async addToCave(
    wine: CatalogueWine, data: CatalogueWineData, quantity: number, selectedSlot: string, isCustom: boolean
  ): Promise<void> {
    const slots = this.freeSlots;
    const start = slots.findIndex(slot => slot.label === selectedSlot);
    if (!this.userId) throw new Error('Utilisateur non connecté.');
    if (start < 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > slots.length) {
      throw new Error('Emplacements invalides ou insuffisants.');
    }

    const placements = [...slots.slice(start), ...slots.slice(0, start)]
      .slice(0, quantity)
      .map(({ row, col }) => ({ row, col }));
    const userWine: Omit<UserWine, 'id'> = {
      ...data,
      vintage: Number(data.vintage) || 0,
      ownerId: this.userId,
      wineCatalogueId: wine.id,
      isCustom,
      description: data.description ?? '',
      foodPairing: data.foodPairing ?? [],
      placements,
    };
    await this.caveService.addWine(userWine);
  }

  async createPersonalWine(data: CatalogueWineData, propose: boolean): Promise<void> {
    if (!this.userId) throw new Error('Utilisateur non connecté.');
    const batch = writeBatch(this.firestore);
    batch.set(doc(collection(this.firestore, 'users', this.userId, 'catalogue')), data);
    if (propose) {
      const proposalRef = doc(collection(this.firestore, 'catalogueProposals'));
      batch.set(proposalRef, { ...data, ownerId: this.userId, status: 'pending', createdAt: new Date() });
    }
    await batch.commit();
  }

  async submitProposal(data: CatalogueWineData): Promise<void> {
    if (!this.userId) throw new Error('Utilisateur non connecté.');
    const proposalRef = doc(collection(this.firestore, 'catalogueProposals'));
    await setDoc(proposalRef, { ...data, ownerId: this.userId, status: 'pending', createdAt: new Date() });
  }
}
