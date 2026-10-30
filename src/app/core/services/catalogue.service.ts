import { Injector, Injectable, NgZone, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  deleteField,
  deleteDoc,
  doc,
  docSnapshots,
  getDoc,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable, catchError, combineLatest, distinctUntilChanged, map, of, shareReplay, switchMap } from 'rxjs';

import {
  CatalogueProposal,
  CatalogueProposalDecision,
  CatalogueWine,
  CatalogueWineData,
} from '../models/catalogue-wine.model';
import { AuthService } from './auth.service';
import { CaveService } from './cave.service';
import { findFreePlacements } from '../utils/placement.util';
import { listFreeSlots, toCatalogueWine, FreeSlot } from '../utils/catalogue.util';
import { omitUndefined } from '../utils/wine.util';

const WISHLIST_KEY_PREFIX = 'catalogue-wishlist-';
const VIEWED_PROPOSALS_KEY_PREFIX = 'catalogue-viewed-proposals-';

/**
 * Catalogue de vins : catalogue commun (`catalogue`), fiches personnelles (`users/{uid}/catalogue`), propositions au catalogue
 * commun (`catalogueProposals`), liste de souhaits (stockée sur l'appareil) et passage en cave.
 */
@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly caveService = inject(CaveService);
  private readonly injector = inject(Injector);
  private readonly ngZone = inject(NgZone);
  private readonly viewedProposalsChanged$ = new BehaviorSubject<void>(undefined);

  /** Catalogue commun publié, accessible aux utilisateurs connectés. */
  readonly communityWines$: Observable<CatalogueWine[]> = this.authService.currentUser$.pipe(
    map((user) => user?.id ?? ''),
    distinctUntilChanged(),
    switchMap((uid) => {
      if (!uid) return of<CatalogueWine[]>([]);

      return this.watchWines(['catalogue'], 'Lecture du catalogue commun impossible :');
    })
  );

  /** Fiches personnelles de l'utilisateur connecté (vide si déconnecté ou en cas d'erreur de lecture). */
  readonly personalWines$: Observable<CatalogueWine[]> = this.authService.currentUser$.pipe(
    map((user) => user?.id ?? ''),
    distinctUntilChanged(),
    switchMap((uid) => {
      if (!uid) return of<CatalogueWine[]>([]);

      return this.watchWines(['users', uid, 'catalogue'], 'Lecture des fiches personnelles impossible :');
    })
  );

  /** Indique si l'utilisateur courant possède une entrée d'administration créée côté console. */
  readonly isAdmin$: Observable<boolean> = this.authService.currentUser$.pipe(
    map((user) => user?.id ?? ''),
    distinctUntilChanged(),
    switchMap((uid) => uid ? this.watchAdmin(uid) : of(false)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /** Toutes les propositions de l'administrateur, y compris les décisions déjà prises. */
  readonly allProposals$: Observable<CatalogueProposal[]> = this.isAdmin$.pipe(
    distinctUntilChanged(),
    switchMap((isAdmin) => isAdmin ? this.watchProposals() : of<CatalogueProposal[]>([])),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /** Propositions en attente, visibles uniquement par les administrateurs. */
  readonly pendingProposals$: Observable<CatalogueProposal[]> = this.allProposals$.pipe(
    map((proposals) => proposals.filter((proposal) => proposal.status === 'pending'))
  );

  /** Nombre de propositions en attente que l'administrateur n'a pas encore consultées. */
  readonly unseenAdminProposalCount$ = combineLatest([
    this.allProposals$,
    this.authService.currentUser$,
    this.viewedProposalsChanged$,
  ]).pipe(
    map(([proposals, user]) => {
      if (!user) return 0;
      const viewedIds = this.loadViewedProposalIds(user.id);
      return proposals.filter((proposal) => proposal.status === 'pending' && !viewedIds.has(proposal.id)).length;
    }),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /** Historique des propositions de l'utilisateur connecté. */
  readonly userProposals$: Observable<CatalogueProposal[]> = this.authService.currentUser$.pipe(
    map((user) => user?.id ?? ''),
    distinctUntilChanged(),
    switchMap((uid) => uid ? this.watchProposals(uid) : of<CatalogueProposal[]>([]))
  );

  private get userId(): string {
    return this.authService.currentUser?.id ?? '';
  }

  /** Marque une proposition comme consultée pour l'administrateur courant. */
  markProposalAsViewed(proposalId: string): void {
    const uid = this.userId;
    if (!uid || !proposalId) return;

    const viewedIds = this.loadViewedProposalIds(uid);
    if (viewedIds.has(proposalId)) return;
    viewedIds.add(proposalId);

    try {
      localStorage.setItem(VIEWED_PROPOSALS_KEY_PREFIX + uid, JSON.stringify([...viewedIds]));
    } catch (error) {
      console.error('Enregistrement de la consultation de la proposition impossible :', error);
      throw error;
    }
    this.ngZone.run(() => this.viewedProposalsChanged$.next());
  }

  /** Lit les noms des auteurs ciblés, uniquement pour les propositions affichées à l'admin. */
  async loadProposalAuthorNames(ownerIds: readonly string[]): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
    const profiles = await Promise.all(uniqueIds.map((uid) => getDoc(doc(this.firestore, 'users', uid))));
    return new Map(profiles.flatMap((profile, index) => {
      if (!profile.exists()) return [];
      const data = profile.data();
      const name = [data['firstName'], data['lastName']]
        .filter((part): part is string => typeof part === 'string')
        .map((part) => part.trim())
        .filter(Boolean)
        .join(' ');
      return name ? [[uniqueIds[index], name] as const] : [];
    }));
  }

  private loadViewedProposalIds(uid: string): Set<string> {
    try {
      const stored = localStorage.getItem(VIEWED_PROPOSALS_KEY_PREFIX + uid);
      if (!stored) return new Set();
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
        console.error('Liste des propositions consultées invalide dans le stockage local.');
        return new Set();
      }
      return new Set(parsed);
    } catch (error) {
      console.error('Lecture des propositions consultées impossible :', error);
      return new Set();
    }
  }

  private watchAdmin(uid: string): Observable<boolean> {
    return runInInjectionContext(this.injector, () => docSnapshots(doc(this.firestore, 'admins', uid))).pipe(
      map((snapshot) => snapshot.data()?.['enabled'] === true),
      catchError((error) => {
        console.error('Vérification des permissions administrateur impossible :', error);
        return of(false);
      })
    );
  }

  private watchProposals(ownerId?: string): Observable<CatalogueProposal[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(
        ownerId
          ? query(collection(this.firestore, 'catalogueProposals'), where('ownerId', '==', ownerId))
          : collection(this.firestore, 'catalogueProposals'),
        { idField: 'id' }
      )
    ).pipe(
      map((documents) =>
        documents
          .map((document) => this.toProposal(document))
          .filter((proposal): proposal is CatalogueProposal => proposal !== null)
          .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      ),
      catchError((error) => {
        console.error('Lecture des propositions impossible :', error);
        return of<CatalogueProposal[]>([]);
      })
    );
  }

  private toProposal(document: Record<string, unknown>): CatalogueProposal | null {
    const id = typeof document['id'] === 'string' ? document['id'] : '';
    const ownerId = typeof document['ownerId'] === 'string' ? document['ownerId'] : '';
    const status = document['status'];
    const wine = toCatalogueWine(id, document);

    if (!id || !ownerId || !wine || !['pending', 'approved', 'rejected'].includes(String(status))) return null;
    const createdAt = this.timestampToIso(document['createdAt']);
    const moderatedAt = this.timestampToIso(document['moderatedAt']);

    return {
      id,
      ownerId,
      status: status as CatalogueProposal['status'],
      name: wine.name,
      domain: wine.domain,
      region: wine.region,
      vintage: wine.vintage,
      type: wine.type,
      grapeVariety: wine.grapeVariety,
      unitPrice: wine.unitPrice,
      ...(wine.description === undefined ? {} : { description: wine.description }),
      ...(wine.foodPairing === undefined ? {} : { foodPairing: wine.foodPairing }),
      ...(wine.rating === undefined ? {} : { rating: wine.rating }),
      ...(wine.peakMaturityYear === undefined ? {} : { peakMaturityYear: wine.peakMaturityYear }),
      ...(createdAt ? { createdAt } : {}),
      ...(typeof document['moderatedBy'] === 'string' ? { moderatedBy: document['moderatedBy'] } : {}),
      ...(moderatedAt ? { moderatedAt } : {}),
      ...(typeof document['rejectionReason'] === 'string' ? { rejectionReason: document['rejectionReason'] } : {}),
    };
  }

  private timestampToIso(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    return undefined;
  }

  private watchWines(path: string[], errorMessage: string): Observable<CatalogueWine[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(collection(this.firestore, path.join('/')), { idField: 'id' })
    ).pipe(
      map((documents) => documents
        .map((document) => toCatalogueWine(String(document['id']), document))
        .filter((wine): wine is CatalogueWine => wine !== null)),
      catchError((error) => {
        console.error(errorMessage, error);
        return of<CatalogueWine[]>([]);
      })
    );
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

  /** Supprime uniquement la fiche personnelle, sans retirer les bouteilles en cave. */
  async deletePersonalWine(wineId: string): Promise<void> {
    const ownerId = this.userId;
    if (!ownerId) throw new Error('Utilisateur non connecté.');
    await deleteDoc(doc(this.firestore, 'users', ownerId, 'catalogue', wineId));
  }

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
  async submitProposal(data: CatalogueWineData): Promise<string> {
    const ownerId = this.userId;
    if (!ownerId) throw new Error('Utilisateur non connecté.');

    const proposalRef = doc(collection(this.firestore, 'catalogueProposals'));
    await setDoc(proposalRef, this.proposalOf(omitUndefined({ ...data }), ownerId));
    return proposalRef.id;
  }

  /** Retire une proposition encore en attente, uniquement pour son auteur. */
  async cancelProposal(proposalId: string): Promise<void> {
    if (!this.userId) throw new Error('Utilisateur non connecté.');
    await deleteDoc(doc(this.firestore, 'catalogueProposals', proposalId));
  }

  /** Publie ou refuse atomiquement une proposition encore en attente avec un lot Firestore. */
  async moderateProposal(
    proposalId: string,
    decision: CatalogueProposalDecision,
    rejectionReason?: string,
    correctedWine?: CatalogueWineData
  ): Promise<void> {
    const adminId = this.userId;
    if (!adminId) throw new Error('Utilisateur non connecté.');

    const proposalRef = doc(this.firestore, 'catalogueProposals', proposalId);
    const catalogueRef = doc(this.firestore, 'catalogue', proposalId);

    const proposalSnapshot = await getDoc(proposalRef);
    if (!proposalSnapshot.exists() || proposalSnapshot.data()['status'] !== 'pending') {
      throw new Error('Cette proposition a déjà été modérée ou n’existe plus.');
    }

    const batch = writeBatch(this.firestore);
    if (decision === 'approved') {
      const publishedSnapshot = await getDoc(catalogueRef);
      if (publishedSnapshot.exists()) throw new Error('Un vin du catalogue utilise déjà cet identifiant.');

      const wine = toCatalogueWine(proposalId, proposalSnapshot.data());
      if (!wine) throw new Error('Les données de la proposition sont invalides.');

      const publishedWine: CatalogueWineData = correctedWine
        ? omitUndefined({ ...correctedWine })
        : {
            name: wine.name,
            domain: wine.domain,
            region: wine.region,
            vintage: wine.vintage,
            type: wine.type,
            grapeVariety: wine.grapeVariety,
            unitPrice: wine.unitPrice,
            ...(wine.description === undefined ? {} : { description: wine.description }),
            ...(wine.foodPairing === undefined ? {} : { foodPairing: wine.foodPairing }),
            ...(wine.rating === undefined ? {} : { rating: wine.rating }),
            ...(wine.peakMaturityYear === undefined ? {} : { peakMaturityYear: wine.peakMaturityYear }),
          };
      batch.set(catalogueRef, publishedWine);
    }

    const reason = rejectionReason?.trim();
    batch.update(proposalRef, {
      ...(decision === 'approved' && correctedWine ? {
        name: correctedWine.name,
        domain: correctedWine.domain,
        region: correctedWine.region,
        vintage: correctedWine.vintage,
        type: correctedWine.type,
        grapeVariety: correctedWine.grapeVariety,
        unitPrice: correctedWine.unitPrice,
        description: correctedWine.description ?? '',
        foodPairing: correctedWine.foodPairing ?? [],
        rating: correctedWine.rating ?? deleteField(),
        peakMaturityYear: correctedWine.peakMaturityYear ?? deleteField(),
      } : {}),
      status: decision,
      moderatedBy: adminId,
      moderatedAt: serverTimestamp(),
      ...(decision === 'rejected' && reason ? { rejectionReason: reason } : {}),
    });
    await batch.commit();
  }

  /** Remet en attente une proposition traitée ; une fiche publiée est retirée atomiquement du catalogue. */
  async requeueProposal(proposalId: string): Promise<void> {
    if (!this.userId) throw new Error('Utilisateur non connecté.');

    const proposalRef = doc(this.firestore, 'catalogueProposals', proposalId);
    const catalogueRef = doc(this.firestore, 'catalogue', proposalId);

    await runTransaction(this.firestore, async (transaction) => {
      const proposalSnapshot = await transaction.get(proposalRef);
      if (!proposalSnapshot.exists()) throw new Error('Cette proposition n’existe plus.');

      const status = proposalSnapshot.data()['status'];
      if (status !== 'approved' && status !== 'rejected') {
        throw new Error('Cette proposition n’est pas traitée.');
      }

      if (status === 'approved') {
        const publishedSnapshot = await transaction.get(catalogueRef);
        if (!publishedSnapshot.exists()) {
          throw new Error('La fiche publiée est introuvable dans le catalogue.');
        }
        transaction.delete(catalogueRef);
      }

      transaction.update(proposalRef, {
        status: 'pending',
        moderatedBy: deleteField(),
        moderatedAt: deleteField(),
        rejectionReason: deleteField(),
      });
    });
  }

  private proposalOf(data: object, ownerId: string) {
    return { ...data, ownerId, status: 'pending', createdAt: serverTimestamp() };
  }
}
