import { Injector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable, catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { CatalogueWine, CatalogueWineData } from '../models/catalogue-wine.model';
import { AuthService } from './auth.service';
import { CaveService } from './cave.service';
import { findFreePlacements } from '../utils/placement.util';
import { listFreeSlots, toCatalogueWine, FreeSlot } from '../utils/catalogue.util';
import { omitUndefined } from '../utils/wine.util';

const WISHLIST_KEY_PREFIX = 'catalogue-wishlist-';

/**
 * Catalogue de vins : fiches personnelles (`users/{uid}/catalogue`), propositions au catalogue
 * commun (`catalogueProposals`), liste de souhaits (stockée sur l'appareil) et passage en cave.
 */
@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly caveService = inject(CaveService);
  private readonly injector = inject(Injector);

  /** Fiches personnelles de l'utilisateur connecté (vide si déconnecté ou en cas d'erreur de lecture). */
  readonly personalWines$: Observable<CatalogueWine[]> = this.authService.currentUser$.pipe(
    map((user) => user?.id ?? ''),
    distinctUntilChanged(),
    switchMap((uid) => {
      if (!uid) return of<CatalogueWine[]>([]);

      return runInInjectionContext(this.injector, () =>
        collectionData(collection(this.firestore, 'users', uid, 'catalogue'), { idField: 'id' })
      ).pipe(
        map((documents) =>
          documents
            .map((document) => toCatalogueWine(String(document['id']), document))
            .filter((wine): wine is CatalogueWine => wine !== null)
        ),
        catchError((error) => {
          console.error('Lecture des fiches personnelles impossible :', error);
          return of<CatalogueWine[]>([]);
        })
      );
    })
  );

  private get userId(): string {
    return this.authService.currentUser?.id ?? '';
  }

  // ── Liste de souhaits (locale à l'appareil) ───────────────

  loadWishlist(): Set<string> {
    if (!this.userId) return new Set();
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(WISHLIST_KEY_PREFIX + this.userId) ?? '[]');
      return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
    } catch {
      return new Set();
    }
  }

  /** Retourne `false` si le stockage de l'appareil est indisponible ou plein. */
  saveWishlist(wishlist: ReadonlySet<string>): boolean {
    if (!this.userId) return false;
    try {
      localStorage.setItem(WISHLIST_KEY_PREFIX + this.userId, JSON.stringify([...wishlist]));
      return true;
    } catch {
      return false;
    }
  }

  // ── Cave ──────────────────────────────────────────────────

  get freeSlots(): FreeSlot[] {
    const { rows, cols } = this.caveService.caveConfig;
    return listFreeSlots(rows, cols, this.caveService.cave);
  }

  /**
   * Met `quantity` bouteilles en cave, à partir de l'emplacement `firstSlot` (libellé `A3`)
   * puis dans les emplacements libres suivants.
   */
  async addToCave(
    wine: CatalogueWine,
    data: CatalogueWineData,
    quantity: number,
    firstSlot: string,
    isCustom: boolean
  ): Promise<void> {
    const ownerId = this.userId;
    if (!ownerId) throw new Error('Utilisateur non connecté.');

    const { rows, cols } = this.caveService.caveConfig;
    const slots = this.freeSlots;
    const start = slots.find((slot) => slot.label === firstSlot);
    if (!start || !Number.isInteger(quantity) || quantity < 1 || quantity > slots.length) {
      throw new Error('Emplacements invalides ou insuffisants.');
    }

    const placements = findFreePlacements(rows, cols, this.caveService.cave, start, quantity);
    await this.caveService.addWine({
      ...data,
      vintage: Number(data.vintage) || 0,
      ownerId,
      wineCatalogueId: wine.id,
      isCustom,
      description: data.description ?? '',
      foodPairing: data.foodPairing ?? [],
      placements,
    });
  }

  // ── Fiches et propositions ────────────────────────────────

  /** Crée une fiche personnelle, et la propose au catalogue commun si `propose` est vrai. */
  async createPersonalWine(data: CatalogueWineData, propose: boolean): Promise<void> {
    const ownerId = this.userId;
    if (!ownerId) throw new Error('Utilisateur non connecté.');

    const payload = omitUndefined({ ...data });
    const batch = writeBatch(this.firestore);
    batch.set(doc(collection(this.firestore, 'users', ownerId, 'catalogue')), payload);
    if (propose) {
      batch.set(doc(collection(this.firestore, 'catalogueProposals')), this.proposalOf(payload, ownerId));
    }
    await batch.commit();
  }

  /** Propose un vin au catalogue commun ; il sera vérifié avant publication. */
  async submitProposal(data: CatalogueWineData): Promise<void> {
    const ownerId = this.userId;
    if (!ownerId) throw new Error('Utilisateur non connecté.');

    await setDoc(
      doc(collection(this.firestore, 'catalogueProposals')),
      this.proposalOf(omitUndefined({ ...data }), ownerId)
    );
  }

  private proposalOf(data: object, ownerId: string) {
    return { ...data, ownerId, status: 'pending', createdAt: serverTimestamp() };
  }
}
