import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Observable, map, Subscription } from 'rxjs';
import { CaveService, CaveSlot } from '../core/services/cave.service';
import { CellarCellComponent } from '../components/cellar-cell/cellar-cell.component';
import { UserWine } from '../core/models/wine.model';
import { AuthService } from '../core/services/auth.service';
import { User } from '../core/models/user.model';
import { WineSheetModalComponent } from '../components/wine-sheet-modal/wine-sheet-modal.component';
import { WINE_TYPE_CONFIG, WineType } from '../core/types/WineType';
import { SearchBarComponent, SearchableItem } from '../components/search-bar/search-bar.component';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-cave',
  standalone: true,
  templateUrl: './cave.page.html',
  styleUrls: ['./cave.page.scss'],
  imports: [
    CommonModule,
    IonicModule,
    CellarCellComponent,
    WineSheetModalComponent,
    SearchBarComponent,
    TranslocoPipe
  ],
})
export class CavePage implements OnInit, OnDestroy {
  grid$!: Observable<CaveSlot[]>;
  gridRows$!: Observable<CaveSlot[][]>;
  isSheetOpen = false;
  wine: UserWine | null = null;
  coords: { row: number; col: number } | null = null;
  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;
  searchableItems: SearchableItem[] = [];
  matchedIds = new Set<string>();
  private caveSubscription?: Subscription;

  constructor(public caveService: CaveService, private auth: AuthService) {}

  ngOnInit() {
    this.grid$ = this.caveService.grid$;
    this.gridRows$ = this.caveService.grid$.pipe(map((slots) => this.groupSlotsByRow(slots)));
    this.updateSearchableItems();
    this.caveSubscription = this.caveService.grid$.subscribe(() => {
      this.updateSearchableItems();
    });
  }

  ngOnDestroy() {
    this.caveSubscription?.unsubscribe();
  }

  updateSearchableItems() {
    const wines = this.caveService.cave;
    this.searchableItems = wines.map(wine => ({
      id: wine.id || '',
      label: wine.name,
      subtitle: `${wine.domain} · ${wine.vintage}`,
      tag: wine.placements?.map(p => this.caveService.formatPlacementCoords(p)).join(', '),
      keywords: [wine.name, wine.domain, wine.region, wine.appellation, wine.grapeVariety],
      placementCount: wine.placements?.length || 1
    }));
  }

  onSearchMatch(matchedIds: Set<string>) {
    this.matchedIds = matchedIds;
  }

  get occupiedCount() {
    return this.caveService.occupiedCount;
  }

  get totalCapacity() {
    return this.caveService.totalCapacity;
  }

  get user() {
    return this.auth.currentUser;
  }

  get caveConfig() {
    return this.caveService.caveConfig;
  }

  onCellTap(slot: CaveSlot): void {
    if (slot.wine) {
      this.wine = slot.wine;
      this.coords = { row: slot.row, col: slot.col };
      this.isSheetOpen = true;
    } else {
     this.addWine(slot.row, slot.col)
    }
  }

  formatCoords(slot: CaveSlot): string {
    return this.caveService.formatPlacementCoords({ row: slot.row, col: slot.col })
  }

  private groupSlotsByRow(slots: CaveSlot[]): CaveSlot[][] {
    return slots.reduce<CaveSlot[][]>((rows, slot) => {
      (rows[slot.row] ??= []).push(slot);
      return rows;
    }, []);
  }

  addWine(x: number, y: number) {
    const wine = {
      name: "Test vin Rouge",
      domain: "Domaine Jean-Louis Chave",
      region: "Rhône",
      appellation: "Tavel",
      type: "red",
      grapeVariety: "Roussanne",
      vintage: 2015,
      description:"Robe jaune or aux reflets dorés. Bouquet complexe de fruits à chair blanche, de miel et de pain grillé. Bouche riche et ample, belle longueur.",

      foodPairing: [
          "Carpaccio de saint-jacques",
          "Huîtres",
          "Sushi"
        ],
        isCustom: true,
        rating: 5,
        unitPrice: 500,
        ownerId: this.user?.id,
        placements: [ {col: y, row: x}]
    } as UserWine;
      this.caveService.addWine(wine).then(() => {
        this.updateSearchableItems();
      });
  }
}
