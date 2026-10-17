import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, InfiniteScrollCustomEvent, IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CaveService } from '../core/services/cave.service';
import { UserWine } from '../core/models/wine.model';
import { WineType, WINE_TYPE_CONFIG } from '../core/types/WineType';
import { CheckboxComponent } from '../components/checkbox/checkbox.component';
import { SelectComponent, SelectOption } from '../components/select/select.component';
import { FormsModule } from '@angular/forms';
import { CustomModalComponent } from '../components/custom-modal/custom-modal.component';
import { ToastService } from '../core/services/toast.service';
import { AuthService } from '../core/services/auth.service';
import { CatalogueService } from '../core/services/catalogue.service';
import { CatalogueWine, CatalogueWineData, CatalogueSort } from '../core/models/catalogue-wine.model';
import { WineSheetModalComponent } from '../components/wine-sheet-modal/wine-sheet-modal.component';
import { AddWineFormComponent } from '../components/add-wine-form/add-wine-form.component';
import { FormBuilder, Validators } from '@angular/forms';

type CatalogueScope = 'community' | 'personal';
type SortValue = CatalogueSort;

const COMMUNITY_WINES: CatalogueWine[] = [
  ['lacave', 'Château Lacave', 'Château Lacave', 'Bordeaux', 2018, WineType.RED, 'Merlot, Cabernet Sauvignon', 28],
  ['sancerre', 'Sancerre Blanc', 'Domaine Vacheron', 'Loire', 2021, WineType.WHITE, 'Sauvignon Blanc', 18],
  ['tavel', 'Tavel Rosé', 'Domaine de la Mordorée', 'Rhône', 2022, WineType.ROSE, 'Grenache, Cinsault, Syrah', 15],
  ['champagne', 'Champagne Brut Réserve', 'Maison Charles', 'Champagne', 'NV', WineType.CHAMPAGNE, 'Chardonnay, Pinot Noir', 32],
  ['bourgogne', 'Bourgogne Pinot Noir', 'Domaine des Cèdres', 'Bourgogne', 2019, WineType.RED, 'Pinot Noir', 24],
  ['cahors', 'Cahors Malbec', 'Clos des Vignes', 'Sud-Ouest', 2017, WineType.RED, 'Malbec', 16],
  ['roussette', 'Roussette de Savoie', 'Domaine de la Pierre', 'Savoie', 2022, WineType.WHITE, 'Altesse', 14],
  ['provence', 'Côtes de Provence Rosé', 'Domaine des Pins', 'Provence', 2023, WineType.ROSE, 'Grenache, Cinsault', 11],
  ['rhone', 'Côtes du Rhône', 'Domaine Saint-Roch', 'Rhône', 2020, WineType.RED, 'Grenache, Syrah', 12],
  ['cremant', 'Crémant de Bourgogne', 'Maison Delaunay', 'Bourgogne', 'NV', WineType.CHAMPAGNE, 'Pinot Noir, Chardonnay', 15],
  ['chablis', 'Chablis Premier Cru', 'Domaine Laroche', 'Bourgogne', 2021, WineType.WHITE, 'Chardonnay', 26],
  ['gigondas', 'Gigondas', 'Domaine des Dentelles', 'Rhône', 2020, WineType.RED, 'Grenache, Syrah', 21],
].map(([id, name, domain, region, vintage, type, grapeVariety, unitPrice]) => ({
  id: id as string,
  name: name as string,
  domain: domain as string,
  region: region as string,
  vintage: vintage as number | string,
  type: type as WineType,
  grapeVariety: grapeVariety as string,
  unitPrice: unitPrice as number,
}));

@Component({
  selector: 'app-catalogue',
  standalone: true,
  templateUrl: './catalogue.page.html',
  styleUrls: ['./catalogue.page.scss'],
  imports: [CommonModule, IonicModule, TranslocoModule, CheckboxComponent, SelectComponent, FormsModule, CustomModalComponent, WineSheetModalComponent, AddWineFormComponent],
})
export class CataloguePage implements OnInit, OnDestroy {
  @ViewChild(IonContent) private content?: IonContent;
  readonly WineType = WineType;
  readonly currentYear = new Date().getFullYear();
  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;
  readonly communityWines = COMMUNITY_WINES;
  get sortOptions(): SelectOption[] { return ['name', 'price-asc', 'price-desc', 'vintage-desc'].map(value => ({ value, label: this.transloco.translate(`CATALOGUE.SORT_${value.replace(/-/g, '_').toUpperCase()}`) })); }

  scope: CatalogueScope = 'community';
  query = '';
  selectedTypes = new Set<WineType>();
  sort: SortValue = 'name';
  selectedRegion = 'all';
  onlyWishlist = false;
  onlyInCave = false;
  filtersOpen = false;
  visibleCount = 6;
  readonly pageSize = 6;
  wishlist = new Set<string>();
  personalWines: CatalogueWine[] = [];
  private winesSubscription?: Subscription;
  private userSubscription?: Subscription;
  private personalSubscription?: Subscription;
  private userId = '';
  caveWines: UserWine[] = [];
  wishlistOpen = false;
  detailsWine: CatalogueWine | null = null;
  addWine: CatalogueWine | null = null;
  createOpen = false;
  proposalOpen = false;
  proposeToCommunity = false;
  selectedSlot = '';
  saving = false;
  readonly createWineForm = this.fb.group({
    type: [WineType.RED as WineType, Validators.required], name: ['', [Validators.required, Validators.maxLength(100)]],
    domain: ['', [Validators.required, Validators.maxLength(100)]], vintage: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(new Date().getFullYear())]],
    peakMaturityYear: [null as number | null], region: ['', [Validators.required, Validators.maxLength(100)]], grapeVariety: ['', [Validators.required, Validators.maxLength(100)]],
    unitPrice: [null as number | null, [Validators.required, Validators.min(0)]], rating: [null as number | null], description: ['', Validators.maxLength(1000)], foodPairing: ['', Validators.maxLength(500)], quantity: [1],
  });

  constructor(public caveService: CaveService, private auth: AuthService, private catalogueService: CatalogueService, private toast: ToastService, private fb: FormBuilder, private transloco: TranslocoService) {}

  ngOnInit(): void {
    this.winesSubscription = this.caveService.grid$.subscribe(() => {
      this.caveWines = this.caveService.cave;
      this.resetVisibleWines();
    });
    this.userSubscription = this.auth.currentUser$.subscribe(user => {
      this.userId = user?.id ?? '';
      this.wishlist = this.userId ? this.catalogueService.loadWishlist() : new Set();
    });
    this.personalSubscription = this.catalogueService.getPersonalWines().subscribe(wines => { this.personalWines = wines; });
  }

  ngOnDestroy(): void {
    this.winesSubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
    this.personalSubscription?.unsubscribe();
  }

  get currentWines(): CatalogueWine[] {
    return (this.scope === 'community' ? COMMUNITY_WINES : this.personalWines).map(wine => ({ ...wine, inCave: this.caveCount(wine) > 0 }));
  }

  get filteredWines(): CatalogueWine[] {
    return this.catalogueService.filterWines(this.scope === 'community' ? COMMUNITY_WINES : this.personalWines, this.query, this.selectedTypes, this.selectedRegion, this.wishlist, this.onlyWishlist, this.onlyInCave, this.sort);
  }

  get displayedWines(): CatalogueWine[] {
    return this.filteredWines.slice(0, this.visibleCount);
  }

  get hasMoreWines(): boolean {
    return this.visibleCount < this.filteredWines.length;
  }

  get regions(): SelectOption[] {
    return [
      { value: 'all', label: this.transloco.translate('CATALOGUE.ALL_REGIONS') },
      ...Array.from(new Set(this.currentWines.map(wine => wine.region)))
        .sort((a, b) => a.localeCompare(b, 'fr'))
        .map(region => ({ value: region, label: region })),
    ];
  }

  get wishlistTotal(): number {
    return [...this.wishlist]
      .map(id => [...COMMUNITY_WINES, ...this.personalWines].find(wine => wine.id === id)?.unitPrice ?? 0)
      .reduce((total, price) => total + price, 0);
  }

  get activeFilterCount(): number {
    return this.selectedTypes.size + (this.selectedRegion !== 'all' ? 1 : 0) + (this.onlyWishlist || this.onlyInCave ? 1 : 0) + (this.sort !== 'name' ? 1 : 0);
  }

  clearStatusFilter(): void { this.onlyWishlist = false; this.onlyInCave = false; this.resetVisibleWines(); }

  setScope(scope: CatalogueScope): void {
    if (this.scope === scope) return;
    this.scope = scope;
    this.selectedRegion = 'all';
    this.resetVisibleWines();
  }

  goPersonal(): void { this.setScope('personal'); void this.content?.scrollToTop(300); }

  toggleType(type: WineType): void {
    if (this.selectedTypes.has(type)) {
      this.selectedTypes.delete(type);
    } else {
      this.selectedTypes.add(type);
    }
    this.resetVisibleWines();
  }

  toggleWishlist(wineId: string, event: Event): void {
    event.stopPropagation();
    if (this.wishlist.has(wineId)) {
      this.wishlist.delete(wineId);
    } else {
      this.wishlist.add(wineId);
    }
    this.saveWishlist();
  }

  get wishlistWines(): CatalogueWine[] { return [...COMMUNITY_WINES, ...this.personalWines].filter(wine => this.wishlist.has(wine.id)); }
  get slotOptions(): SelectOption[] { return this.freeSlots.map(slot => ({ value: slot.label, label: slot.label })); }
  get typeOptions(): SelectOption[] { return [WineType.RED, WineType.WHITE, WineType.ROSE, WineType.CHAMPAGNE].map(type => ({ value: type, label: WINE_TYPE_CONFIG[type].label })); }
  get detailsUserWine(): UserWine | null {
    const wine = this.detailsWine;
    if (!wine) return null;
    const caveWine = this.caveWines.find(item => item.wineCatalogueId === wine.id);
    return { id: wine.id, ownerId: this.userId, wineCatalogueId: wine.id, isCustom: this.personalWines.some(item => item.id === wine.id), name: wine.name, domain: wine.domain, region: wine.region, vintage: Number(wine.vintage) || 0, type: wine.type, grapeVariety: wine.grapeVariety, unitPrice: wine.unitPrice, description: wine.description ?? caveWine?.description ?? '', foodPairing: wine.foodPairing ?? caveWine?.foodPairing ?? [], placements: caveWine?.placements ?? [] };
  }
  openDetails(wine: CatalogueWine): void { this.detailsWine = wine; }
  toggleDetailsWishlist(): void { if (this.detailsWine) this.toggleWishlist(this.detailsWine.id, new Event('click')); }
  addDetailsToCave(): void { if (this.detailsWine) this.openAdd(this.detailsWine); }
  get freeSlots(): { row: number; col: number; label: string }[] { return this.catalogueService.freeSlots; }
  caveCount(wine: CatalogueWine): number {
    return this.catalogueService.caveCount(wine);
  }
  openAdd(wine: CatalogueWine, event?: Event): void {
    event?.stopPropagation(); this.detailsWine = null; this.wishlistOpen = false;
    this.resetCreateForm();
    this.createWineForm.patchValue({ type: wine.type, name: wine.name, domain: wine.domain, region: wine.region, vintage: Number(wine.vintage) || new Date().getFullYear(), grapeVariety: wine.grapeVariety, unitPrice: wine.unitPrice, description: wine.description ?? '', foodPairing: (wine.foodPairing ?? []).join(', ') });
    this.createWineForm.controls.quantity.setValidators([Validators.required, Validators.min(1), Validators.max(this.freeSlots.length)]);
    this.createWineForm.controls.quantity.updateValueAndValidity();
    this.selectedSlot = this.freeSlots[0]?.label ?? ''; this.addWine = wine;
  }
  async submitAdd(): Promise<void> {
    const wine = this.addWine;
    if (!wine || this.createWineForm.invalid) { this.createWineForm.markAllAsTouched(); return; }
    this.saving = true;
    try {
      await this.catalogueService.addToCave(wine, this.formData(), Number(this.createWineForm.value.quantity), this.selectedSlot, this.personalWines.some(w => w.id === wine.id));
      this.wishlist.delete(wine.id); this.saveWishlist(); this.addWine = null; this.toast.success(this.transloco.translate('CATALOGUE.ADD_SUCCESS'));
    } catch { this.toast.error(this.transloco.translate('CATALOGUE.ADD_ERROR')); } finally { this.saving = false; }
  }
  async createWine(): Promise<void> {
    if (!this.userId || this.createWineForm.invalid) { this.createWineForm.markAllAsTouched(); return; }
    this.saving = true;
    try {
      await this.catalogueService.createPersonalWine(this.formData(), this.proposeToCommunity);
      this.createOpen = false; this.resetCreateForm(); this.toast.success(this.transloco.translate('CATALOGUE.CREATE_SUCCESS'));
    } catch { this.toast.error(this.transloco.translate('CATALOGUE.CREATE_ERROR')); } finally { this.saving = false; }
  }
  async submitProposal(): Promise<void> {
    if (!this.userId || this.createWineForm.invalid) { this.createWineForm.markAllAsTouched(); return; }
    this.saving = true;
    try { await this.catalogueService.submitProposal(this.formData()); this.proposalOpen = false; this.resetCreateForm(); this.toast.success(this.transloco.translate('CATALOGUE.PROPOSAL_SUCCESS')); }
    catch { this.toast.error(this.transloco.translate('CATALOGUE.PROPOSAL_ERROR')); } finally { this.saving = false; }
  }
  openCreate(): void { this.resetCreateForm(); this.createOpen = true; }
  openProposal(): void { this.resetCreateForm(); this.proposalOpen = true; }
  private resetCreateForm(): void { this.proposeToCommunity = false; this.createWineForm.controls.quantity.clearValidators(); this.createWineForm.reset({ type: WineType.RED, name: '', domain: '', vintage: new Date().getFullYear(), peakMaturityYear: null, region: '', grapeVariety: '', unitPrice: null, rating: null, description: '', foodPairing: '', quantity: 1 }); }
  private formData(): CatalogueWineData { const d = this.createWineForm.getRawValue(); const data: CatalogueWineData = { name: d.name!.trim(), domain: d.domain!.trim(), region: d.region!.trim(), vintage: Number(d.vintage), type: d.type!, grapeVariety: d.grapeVariety!.trim(), unitPrice: Number(d.unitPrice), description: d.description?.trim() ?? '', foodPairing: (d.foodPairing ?? '').split(',').map(v => v.trim()).filter(Boolean) }; if (d.rating != null) data.rating = d.rating; if (d.peakMaturityYear != null) data.peakMaturityYear = d.peakMaturityYear; return data; }
  private saveWishlist(): void { try { this.catalogueService.saveWishlist(this.wishlist); } catch { this.toast.error(this.transloco.translate('CATALOGUE.WISHLIST_SAVE_ERROR')); } }

  onSearch(event: CustomEvent): void {
    this.query = event.detail.value ?? '';
    this.resetVisibleWines();
  }

  updateSort(value: string): void {
    this.sort = value as SortValue;
    this.resetVisibleWines();
  }

  updateRegion(value: string): void {
    this.selectedRegion = value;
    this.resetVisibleWines();
  }

  updateWishlistFilter(checked: boolean): void {
    this.onlyWishlist = checked;
    this.resetVisibleWines();
  }

  updateCaveFilter(checked: boolean): void {
    this.onlyInCave = checked;
    this.resetVisibleWines();
  }

  resetFilters(): void {
    this.query = '';
    this.selectedTypes.clear();
    this.selectedRegion = 'all';
    this.sort = 'name';
    this.onlyWishlist = false;
    this.onlyInCave = false;
    this.resetVisibleWines();
  }

  loadMore(event: InfiniteScrollCustomEvent): void {
    this.visibleCount += this.pageSize;
    event.target.complete();
  }

  wineTypeColor(type: WineType): string {
    const color = WINE_TYPE_CONFIG[type].gradientColor === 'accent'
      ? `var(--wine-${type}-accent)`
      : `var(--wine-${type})`;
    return color;
  }

  private resetVisibleWines(): void {
    this.visibleCount = this.pageSize;
  }

}
