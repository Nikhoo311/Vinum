import { Injector, inject, Injectable, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  arrayRemove,
  arrayUnion,
  collection,
  collectionData,
  deleteDoc,
  deleteField,
  doc,
  DocumentData,
  setDoc,
  updateDoc,
  writeBatch,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable, catchError, combineLatest, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { CaveConfig, EMPTY_CAVE_CONFIG } from '../models/user.model';
import { CaveSlot, CellPlacement, UserWine } from '../models/wine.model';
import { CAVE_MAX_PREMIUM } from '../types/WineType';
import { CaveStats, computeCaveStats } from '../utils/cave-stats.util';
import { AppError, ERROR_KEYS } from '../utils/error.util';
import { ResizePlan, buildGrid, formatPlacement, planResize } from '../utils/placement.util';
import { compareWinesByName, isSameWine, normalizeWine, omitUndefined } from '../utils/wine.util';
import { AuthService } from './auth.service';

export type { CaveSlot } from '../models/wine.model';

/** Champs facultatifs d'un vin, supprimés de Firestore lorsqu'ils disparaissent d'une fiche modifiée. */
const OPTIONAL_WINE_FIELDS = ['rating', 'peakMaturityYear', 'appellation', 'grapeVariety', 'wineCatalogueId'] as const;

/**
 * Cave de l'utilisateur connecté (`users/{uid}/wine`).
 *
 * La liste des vins est alimentée par un écouteur Firestore temps réel : toutes les écritures
 * passent par Firestore et reviennent par ce flux, qui reste l'unique source de vérité.
 */
@Injectable({ providedIn: 'root' })
export class CaveService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly injector = inject(Injector);

  private readonly winesSubject = new BehaviorSubject<UserWine[]>([]);
  private statsCache: { wines: readonly UserWine[]; stats: CaveStats } | null = null;

  /** Vins de la cave, triés par nom. */
  readonly wines$ = this.winesSubject.asObservable();

  /** Statistiques agrégées de la cave. */
  readonly stats$ = this.wines$.pipe(map((wines) => computeCaveStats(wines)));

  /** Grille complète de la cave, recalculée à chaque changement de vins ou de disposition. */
  readonly grid$: Observable<CaveSlot[]> = combineLatest([this.authService.currentUser$, this.wines$]).pipe(
    map(([user, wines]) => {
      const { rows, cols } = user?.caveConfig ?? EMPTY_CAVE_CONFIG;
      return buildGrid(rows, cols, wines);
    })
  );

  constructor() {
    this.authService.currentUser$
      .pipe(
        map((user) => user?.id ?? null),
        distinctUntilChanged(),
        switchMap((uid) => (uid ? this.watchWines(uid) : of<UserWine[]>([])))
      )
      .subscribe((wines) => this.winesSubject.next(wines));
  }

  // ── Lecture synchrone (valeur courante) ───────────────────

  get cave(): UserWine[] {
    return this.winesSubject.value;
  }

  get caveConfig(): CaveConfig {
    return this.authService.currentUser?.caveConfig ?? EMPTY_CAVE_CONFIG;
  }

  /** Statistiques de la valeur courante ; mémorisées tant que la liste des vins ne change pas. */
  get stats(): CaveStats {
    const wines = this.winesSubject.value;
    let cache = this.statsCache;
    if (!cache || cache.wines !== wines) {
      cache = { wines, stats: computeCaveStats(wines) };
      this.statsCache = cache;
    }
    return cache.stats;
  }

  get totalCapacity(): number {
    const { rows, cols } = this.caveConfig;
    return rows * cols;
  }

  /** Nombre d'emplacements occupés (une bouteille occupe un emplacement). */
  get occupiedCount(): number {
    return this.stats.totalBottles;
  }

  get totalBottles(): number {
    return this.stats.totalBottles;
  }

  get totalValue(): number {
    return this.stats.totalValue;
  }

  get uniqueRegionsCount(): number {
    return this.stats.uniqueRegionsCount;
  }

  get averageRating(): number {
    return this.stats.averageRating;
  }

  /** Vins notés, du mieux noté au moins bien noté. */
  get winesSortedByRatingDesc(): UserWine[] {
    return this.cave
      .filter((wine) => typeof wine.rating === 'number')
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  formatPlacementCoords(placement: CellPlacement | null | undefined): string {
    return formatPlacement(placement);
  }

  // ── Écriture ──────────────────────────────────────────────

  /**
   * Ajoute des bouteilles. Si le même vin existe déjà (nom, domaine, millésime, appellation
   * et type identiques), les nouveaux emplacements sont ajoutés à sa fiche.
   */
  async addWine(wine: Omit<UserWine, 'id'>): Promise<void> {
    const uid = this.requireUserId();
    const existing = this.cave.find((candidate) => candidate.id && isSameWine(candidate, wine));

    if (existing?.id) {
      const wineRef = doc(this.firestore, 'users', uid, 'wine', existing.id);
      await this.settle(updateDoc(wineRef, { placements: arrayUnion(...wine.placements) }));
      return;
    }

    const wineRef = doc(collection(this.firestore, 'users', uid, 'wine'));
    await this.settle(
      setDoc(wineRef, omitUndefined({ ...wine, id: wineRef.id, addedAt: wine.addedAt ?? new Date().toISOString() })),
    );
  }

  /**
   * Met à jour les informations d'un vin. Les emplacements ne sont pas modifiés ici
   * (voir {@link addWine}, {@link removeBottle}, {@link resizeCave}) ; les champs facultatifs
   * absents de `wine` sont supprimés de Firestore.
   */
  async updateWine(wine: UserWine): Promise<void> {
    const uid = this.requireUserId();
    if (!wine.id) throw new AppError(ERROR_KEYS.generic);

    const payload: DocumentData = omitUndefined({ ...wine });
    delete payload['id'];
    delete payload['ownerId'];
    delete payload['placements'];
    for (const field of OPTIONAL_WINE_FIELDS) {
      if (payload[field] === undefined) payload[field] = deleteField();
    }

    await this.settle(updateDoc(doc(this.firestore, 'users', uid, 'wine', wine.id), payload));
  }

  /** Note un vin (de 0 à 5) ou retire sa note avec `null`. */
  async updateWineRating(wineId: string, rating: number | null): Promise<void> {
    const uid = this.requireUserId();
    const wineRef = doc(this.firestore, 'users', uid, 'wine', wineId);
    await this.settle(updateDoc(wineRef, rating === null ? { rating: deleteField() } : { rating }));
  }

  async deleteWine(wineId: string): Promise<void> {
    const uid = this.requireUserId();
    await this.settle(deleteDoc(doc(this.firestore, 'users', uid, 'wine', wineId)));
  }

  /** Retire une bouteille ; la fiche est supprimée lorsqu'il ne lui reste plus aucun emplacement. */
  async removeBottle(wineId: string, placementToRemove: CellPlacement): Promise<void> {
    const uid = this.requireUserId();
    const wine = this.cave.find((candidate) => candidate.id === wineId);
    if (!wine) throw new AppError(ERROR_KEYS.generic);

    const remaining = wine.placements.filter(
      (placement) => !(placement.row === placementToRemove.row && placement.col === placementToRemove.col)
    );

    if (remaining.length === 0) {
      await this.deleteWine(wineId);
      return;
    }

    const wineRef = doc(this.firestore, 'users', uid, 'wine', wineId);
    await this.settle(
      updateDoc(wineRef, { placements: arrayRemove({ row: placementToRemove.row, col: placementToRemove.col }) })
    );
  }

  /** Simule un redimensionnement : indique combien de bouteilles seraient retirées. */
  previewResize(rows: number, cols: number): ResizePlan {
    return planResize(this.cave, rows, cols);
  }

  /**
   * Redimensionne la cave. Les bouteilles qui sortent de la nouvelle grille sont retirées
   * (fiches supprimées si plus aucun emplacement) et la nouvelle disposition est enregistrée
   * dans un seul lot atomique : tout est appliqué, ou rien.
   */
  async resizeCave(rows: number, cols: number): Promise<ResizePlan> {
    const uid = this.requireUserId();
    const user = this.authService.currentUser;
    if (!user) throw new AppError(ERROR_KEYS.notAuthenticated);

    const valid = (value: number) => Number.isInteger(value) && value >= 1 && value <= CAVE_MAX_PREMIUM;
    if (!valid(rows) || !valid(cols) || rows * cols > CAVE_MAX_PREMIUM) {
      throw new AppError(ERROR_KEYS.generic);
    }

    const plan = planResize(this.cave, rows, cols);
    const caveConfig: CaveConfig = { ...user.caveConfig, rows, cols };

    const batch = writeBatch(this.firestore);
    for (const { wineId, placements } of plan.updates) {
      batch.update(doc(this.firestore, 'users', uid, 'wine', wineId), { placements });
    }
    for (const wineId of plan.deletions) {
      batch.delete(doc(this.firestore, 'users', uid, 'wine', wineId));
    }
    batch.update(doc(this.firestore, 'users', uid), { caveConfig });

    await this.settle(batch.commit());
    this.authService.patchLocalUser({ caveConfig });
    return plan;
  }

  // ── Internes ──────────────────────────────────────────────

  private requireUserId(): string {
    const uid = this.authService.currentUser?.id;
    if (!uid) throw new AppError(ERROR_KEYS.notAuthenticated);
    return uid;
  }

  /**
   * Firestore applique l'écriture localement tout de suite mais ne résout la promesse qu'une
   * fois le serveur joint. Hors ligne, on n'attend donc pas la confirmation : l'écriture est
   * mise en file (cache persistant) et synchronisée au retour du réseau.
   */
  private async settle(write: Promise<unknown>): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      write.catch((error) => console.error('Écriture différée refusée par le serveur :', error));
      return;
    }
    await write;
  }

  private watchWines(uid: string): Observable<UserWine[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(collection(this.firestore, 'users', uid, 'wine'), { idField: 'id' })
    ).pipe(
      map((documents) =>
        documents
          .map((document) => normalizeWine(document, uid))
          .filter((wine): wine is UserWine => wine !== null)
          .sort(compareWinesByName)
      ),
      catchError((error) => {
        console.error('Lecture de la cave impossible :', error);
        return of<UserWine[]>([]);
      })
    );
  }
}
