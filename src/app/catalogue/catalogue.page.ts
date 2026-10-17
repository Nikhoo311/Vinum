import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InfiniteScrollCustomEvent, IonContent, IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { combineLatest } from 'rxjs';

import { AddWineFormComponent } from '../components/add-wine-form/add-wine-form.component';
import { CheckboxComponent } from '../components/checkbox/checkbox.component';
import { CustomModalComponent } from '../components/custom-modal/custom-modal.component';
import { SelectComponent, SelectOption } from '../components/select/select.component';
import { WineSheetModalComponent } from '../components/wine-sheet-modal/wine-sheet-modal.component';
import { createWineForm, emptyWineFormValue, wineDetailsFromForm } from '../core/forms/wine-form';
import {
  CatalogueScope,
  CatalogueSort,
  CatalogueStatus,
  CatalogueWine,
  CatalogueWineData,
} from '../core/models/catalogue-wine.model';
import { UserWine } from '../core/models/wine.model';
import { AuthService } from '../core/services/auth.service';
import { CatalogueService } from '../core/services/catalogue.service';
import { CaveService } from '../core/services/cave.service';
import { ToastService } from '../core/services/toast.service';
import { WINE_TYPES, WINE_TYPE_CONFIG, WineType } from '../core/types/WineType';
import {
  ALL_REGIONS,
  CatalogueCriteria,
  FreeSlot,
  countActiveFilters,
  filterCatalogue,
  listRegions,
  pickWishlisted,
  withCellarFlag,
  wishlistTotal,
} from '../core/utils/catalogue.util';
import { formatFoodPairing } from '../core/utils/wine.util';
import { COMMUNITY_WINES } from './community-wines';

/** Nombre de vins ajoutés à chaque défilement. */
const PAGE_SIZE = 6;

const SORT_OPTIONS: readonly { value: CatalogueSort; labelKey: string }[] = [
  { value: 'name', labelKey: 'CATALOGUE.SORT_NAME' },
  { value: 'price-asc', labelKey: 'CATALOGUE.SORT_PRICE_ASC' },
  { value: 'price-desc', labelKey: 'CATALOGUE.SORT_PRICE_DESC' },
  { value: 'vintage-desc', labelKey: 'CATALOGUE.SORT_VINTAGE_DESC' },
];

const STATUS_OPTIONS: readonly { value: CatalogueStatus; labelKey: string }[] = [
  { value: 'all', labelKey: 'CATALOGUE.STATUS_ALL' },
  { value: 'wishlist', labelKey: 'CATALOGUE.WISHLIST' },
  { value: 'cellar', labelKey: 'CATALOGUE.ALREADY_IN_CELLAR' },
];

/**
 * Catalogue de vins : recherche et filtres, liste de souhaits, mise en cave et création de fiches.
 * La liste affichée est recalculée à chaque changement d'un critère (voir {@link refresh}),
 * pas à chaque cycle de détection de changements.
 */
@Component({
  selector: 'app-catalogue',
  standalone: true,
  templateUrl: './catalogue.page.html',
  styleUrls: ['./catalogue.page.scss'],
  imports: [
    CommonModule,
    IonicModule,
    TranslocoModule,
    AddWineFormComponent,
    CheckboxComponent,
    CustomModalComponent,
    SelectComponent,
    WineSheetModalComponent,
  ],
})
export class CataloguePage implements OnInit {
  private readonly caveService = inject(CaveService);
  private readonly auth = inject(AuthService);
  private readonly catalogueService = inject(CatalogueService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(IonContent) private content?: IonContent;

  readonly WINE_TYPES = WINE_TYPES;
  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;
  readonly communityCount = COMMUNITY_WINES.length;

  /** Formulaire partagé par la mise en cave, la création de fiche et la proposition. */
  readonly wineForm = createWineForm(inject(FormBuilder));

  // Critères
  scope: CatalogueScope = 'community';
  query = '';
  readonly selectedTypes = new Set<WineType>();
  region = ALL_REGIONS;
  status: CatalogueStatus = 'all';
  sort: CatalogueSort = 'name';

  // Données et résultats calculés
  personalWines: CatalogueWine[] = [];
  wishlist = new Set<string>();
  filteredWines: CatalogueWine[] = [];
  displayedWines: CatalogueWine[] = [];
  wishlistWines: CatalogueWine[] = [];
  wishlistSum = 0;
  regionOptions: SelectOption[] = [];
  activeFilterCount = 0;
  visibleCount = PAGE_SIZE;

  // Modales
  filtersOpen = false;
  wishlistOpen = false;
  createOpen = false;
  proposalOpen = false;
  detailsWine: UserWine | null = null;
  addWine: CatalogueWine | null = null;
  freeSlots: FreeSlot[] = [];
  selectedSlot = '';
  proposeToCommunity = false;
  saving = false;

  private userId = '';
  private caveWines: UserWine[] = [];

  ngOnInit(): void {
    combineLatest([this.caveService.wines$, this.catalogueService.personalWines$, this.auth.currentUser$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([cave, personal, user]) => {
        if ((user?.id ?? '') !== this.userId) {
          this.userId = user?.id ?? '';
          this.wishlist = this.catalogueService.loadWishlist();
        }
        this.caveWines = cave;
        this.personalWines = personal;
        this.refresh();
      });

    // Les libellés calculés (« Toutes les régions »…) dépendent de la langue.
    this.transloco.langChanges$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refresh());
  }

  // ── Libellés et listes pour le gabarit ────────────────────

  get sortOptions(): SelectOption[] {
    return SORT_OPTIONS.map(({ value, labelKey }) => ({ value, label: this.transloco.translate(labelKey) }));
  }

  get statusOptions(): SelectOption[] {
    return STATUS_OPTIONS.map(({ value, labelKey }) => ({ value, label: this.transloco.translate(labelKey) }));
  }

  get slotOptions(): SelectOption[] {
    return this.freeSlots.map(({ label }) => ({ value: label, label }));
  }

  get hasActiveCriteria(): boolean {
    return this.query.trim() !== '' || this.activeFilterCount > 0;
  }

  get hasMoreWines(): boolean {
    return this.visibleCount < this.filteredWines.length;
  }

  get isPersonalEmpty(): boolean {
    return this.scope === 'personal' && this.personalWines.length === 0;
  }

  get statusFilterLabelKey(): string {
    return this.status === 'wishlist' ? 'CATALOGUE.WISHLIST' : 'CATALOGUE.IN_CELLAR';
  }

  get isDetailsWishlisted(): boolean {
    return !!this.detailsWine?.id && this.wishlist.has(this.detailsWine.id);
  }

  isWishlisted(wineId: string): boolean {
    return this.wishlist.has(wineId);
  }

  typeColor(type: WineType): string {
    return WINE_TYPE_CONFIG[type].gradientColor === 'accent' ? `var(--wine-${type}-accent)` : `var(--wine-${type})`;
  }

  // ── Critères ──────────────────────────────────────────────

  setScope(scope: CatalogueScope): void {
    if (this.scope === scope) return;
    this.scope = scope;
    this.region = ALL_REGIONS;
    this.refresh();
  }

  goPersonal(): void {
    this.setScope('personal');
    void this.content?.scrollToTop(300);
  }

  onSearch(event: Event): void {
    this.query = (event as CustomEvent<{ value?: string | null }>).detail.value ?? '';
    this.refresh();
  }

  toggleType(type: WineType): void {
    if (!this.selectedTypes.delete(type)) this.selectedTypes.add(type);
    this.refresh();
  }

  updateStatus(value: string): void {
    this.status = value as CatalogueStatus;
    this.refresh();
  }

  updateRegion(value: string): void {
    this.region = value;
    this.refresh();
  }

  updateSort(value: string): void {
    this.sort = value as CatalogueSort;
    this.refresh();
  }

  /** Réinitialise les filtres, la recherche comprise. */
  resetFilters(): void {
    this.query = '';
    this.selectedTypes.clear();
    this.region = ALL_REGIONS;
    this.status = 'all';
    this.sort = 'name';
    this.refresh();
  }

  loadMore(event: InfiniteScrollCustomEvent): void {
    this.visibleCount += PAGE_SIZE;
    this.displayedWines = this.filteredWines.slice(0, this.visibleCount);
    void event.target.complete();
  }

  // ── Liste de souhaits ─────────────────────────────────────

  toggleWishlist(wineId: string, event?: Event): void {
    event?.stopPropagation();
    if (!this.wishlist.delete(wineId)) this.wishlist.add(wineId);
    this.persistWishlist();
    this.refresh();
  }

  // ── Fiche détaillée ───────────────────────────────────────

  openDetails(wine: CatalogueWine): void {
    const owned = this.caveWines.find((item) => item.wineCatalogueId === wine.id);
    this.detailsWine = {
      id: wine.id,
      ownerId: this.userId,
      wineCatalogueId: wine.id,
      isCustom: this.personalWines.some((item) => item.id === wine.id),
      name: wine.name,
      domain: wine.domain,
      region: wine.region,
      vintage: Number(wine.vintage) || 0,
      type: wine.type,
      grapeVariety: wine.grapeVariety,
      unitPrice: wine.unitPrice,
      rating: wine.rating,
      peakMaturityYear: wine.peakMaturityYear,
      description: wine.description || owned?.description || '',
      foodPairing: wine.foodPairing?.length ? wine.foodPairing : (owned?.foodPairing ?? []),
      placements: owned?.placements ?? [],
    };
  }

  closeDetails(): void {
    this.detailsWine = null;
  }

  toggleDetailsWishlist(): void {
    if (this.detailsWine?.id) this.toggleWishlist(this.detailsWine.id);
  }

  addDetailsToCave(): void {
    const wine = this.findWine(this.detailsWine?.id);
    if (wine) this.openAdd(wine);
  }

  // ── Mise en cave ──────────────────────────────────────────

  openAdd(wine: CatalogueWine, event?: Event): void {
    event?.stopPropagation();
    this.detailsWine = null;
    this.wishlistOpen = false;

    this.freeSlots = this.catalogueService.freeSlots;
    this.selectedSlot = this.freeSlots[0]?.label ?? '';

    const foodPairing = wine.foodPairing?.length ? formatFoodPairing(wine.foodPairing) : this.defaultFoodPairing(wine.type);
    this.resetForm();
    this.wineForm.patchValue({
      type: wine.type,
      name: wine.name,
      domain: wine.domain,
      region: wine.region,
      vintage: Number(wine.vintage) || new Date().getFullYear(),
      grapeVariety: wine.grapeVariety,
      unitPrice: wine.unitPrice,
      description: wine.description ?? '',
      peakMaturityYear: wine.peakMaturityYear ?? null,
      rating: wine.rating ?? null,
      foodPairing,
    });
    this.wineForm.controls.quantity.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(Math.max(1, this.freeSlots.length)),
    ]);
    this.wineForm.controls.quantity.updateValueAndValidity();
    this.addWine = wine;
  }

  async submitAdd(): Promise<void> {
    const wine = this.addWine;
    if (!wine || this.saving) return;
    if (this.wineForm.invalid) {
      this.wineForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    try {
      await this.catalogueService.addToCave(
        wine,
        this.formData(),
        Number(this.wineForm.getRawValue().quantity),
        this.selectedSlot,
        this.personalWines.some((item) => item.id === wine.id)
      );
      if (this.wishlist.delete(wine.id)) this.persistWishlist();
      this.addWine = null;
      this.refresh();
      void this.toast.success(this.transloco.translate('CATALOGUE.ADD_SUCCESS'));
    } catch (error) {
      console.error('Mise en cave impossible :', error);
      void this.toast.error(this.transloco.translate('CATALOGUE.ADD_ERROR'));
    } finally {
      this.saving = false;
    }
  }

  // ── Fiches personnelles et propositions ───────────────────

  openCreate(): void {
    this.resetForm();
    this.createOpen = true;
  }

  openProposal(): void {
    this.resetForm();
    this.proposalOpen = true;
  }

  async createWine(): Promise<void> {
    if (this.saving) return;
    if (!this.userId || this.wineForm.invalid) {
      this.wineForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    try {
      await this.catalogueService.createPersonalWine(this.formData(), this.proposeToCommunity);
      this.createOpen = false;
      void this.toast.success(this.transloco.translate('CATALOGUE.CREATE_SUCCESS'));
    } catch (error) {
      console.error('Création de la fiche impossible :', error);
      void this.toast.error(this.transloco.translate('CATALOGUE.CREATE_ERROR'));
    } finally {
      this.saving = false;
    }
  }

  async submitProposal(): Promise<void> {
    if (this.saving) return;
    if (!this.userId || this.wineForm.invalid) {
      this.wineForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    try {
      await this.catalogueService.submitProposal(this.formData());
      this.proposalOpen = false;
      void this.toast.success(this.transloco.translate('CATALOGUE.PROPOSAL_SUCCESS'));
    } catch (error) {
      console.error("Envoi de la proposition impossible :", error);
      void this.toast.error(this.transloco.translate('CATALOGUE.PROPOSAL_ERROR'));
    } finally {
      this.saving = false;
    }
  }

  // ── Internes ──────────────────────────────────────────────

  private get allWines(): CatalogueWine[] {
    return [...COMMUNITY_WINES, ...this.personalWines];
  }

  private findWine(id: string | undefined): CatalogueWine | undefined {
    return id ? this.allWines.find((wine) => wine.id === id) : undefined;
  }

  private get criteria(): CatalogueCriteria {
    return { query: this.query, types: this.selectedTypes, region: this.region, status: this.status, sort: this.sort };
  }

  /** Recalcule tout ce que le gabarit affiche ; à appeler après chaque changement de critère ou de donnée. */
  private refresh(): void {
    const source = this.scope === 'community' ? COMMUNITY_WINES : this.personalWines;

    this.filteredWines = filterCatalogue(source, this.criteria, this.wishlist, this.caveWines);
    this.visibleCount = PAGE_SIZE;
    this.displayedWines = this.filteredWines.slice(0, this.visibleCount);
    this.activeFilterCount = countActiveFilters(this.criteria);

    this.wishlistWines = withCellarFlag(pickWishlisted(this.allWines, this.wishlist), this.caveWines);
    this.wishlistSum = wishlistTotal(this.wishlistWines);

    this.regionOptions = [
      { value: ALL_REGIONS, label: this.transloco.translate('CATALOGUE.ALL_REGIONS') },
      ...listRegions(source).map((region) => ({ value: region, label: region })),
    ];
  }

  private persistWishlist(): void {
    if (!this.catalogueService.saveWishlist(this.wishlist)) {
      void this.toast.error(this.transloco.translate('CATALOGUE.WISHLIST_SAVE_ERROR'));
    }
  }

  private defaultFoodPairing(type: WineType): string {
    return WINE_TYPE_CONFIG[type].defaultFoodPairing.map((key) => this.transloco.translate(key)).join(', ');
  }

  private resetForm(): void {
    this.proposeToCommunity = false;
    this.wineForm.controls.quantity.setValidators([Validators.required, Validators.min(1)]);
    this.wineForm.reset(emptyWineFormValue(this.defaultFoodPairing(WineType.RED)));
  }

  private formData(): CatalogueWineData {
    const details = wineDetailsFromForm(this.wineForm.getRawValue());
    return { ...details, grapeVariety: details.grapeVariety ?? '' };
  }
}
