import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { environment } from '../../environments/environment';
import { WineSheetModalComponent } from '../components/wine-sheet-modal/wine-sheet-modal.component';
import { User } from '../core/models/user.model';
import { UserWine } from '../core/models/wine.model';
import { AuthService } from '../core/services/auth.service';
import { CatalogueService } from '../core/services/catalogue.service';
import { CaveService } from '../core/services/cave.service';
import { StarWineService } from '../core/services/star-wine.service';
import { WINE_TYPE_CONFIG, WineType } from '../core/types/WineType';
import { CaveStats, RegionDistribution, fillPercentage, percentageOf } from '../core/utils/cave-stats.util';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslocoModule, WineSheetModalComponent],
})
export class HomePage {
  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;
  readonly features = environment.features;

  isSheetOpen = false;

  /** Nombre de vins de la liste de souhaits (relu à chaque affichage de l'onglet). */
  wishlistCount = 0;

  private readonly authService = inject(AuthService);
  private readonly caveService = inject(CaveService);
  private readonly starWineService = inject(StarWineService);
  private readonly catalogueService = inject(CatalogueService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  private readonly numberFormats = new Map<string, Intl.NumberFormat>();

  ionViewWillEnter(): void {
    if (this.features.catalogue) this.wishlistCount = this.catalogueService.loadWishlist().size;
  }

  get user(): User | null {
    return this.authService.currentUser;
  }

  /** Statistiques de la cave (mémorisées par le service tant que les vins ne changent pas). */
  private get stats(): CaveStats {
    return this.caveService.stats;
  }

  get totalBottles(): number {
    return this.stats.totalBottles;
  }

  get averageRating(): number {
    return this.stats.averageRating;
  }

  get ratedWinesCount(): number {
    return this.stats.ratedCount;
  }

  get starWine(): UserWine | null {
    return this.starWineService.star;
  }

  /** Valeur qui a désigné le vin star (« 32 € / bouteille », « ★ 4,8 / 5 »…). */
  get starWineMetric(): string {
    const { ranking, criterion } = this.starWineService.result;
    return ranking.length ? this.starWineService.describe(ranking[0], criterion) : '';
  }

  /** Nom du critère appliqué, pour l'infobulle. */
  get starWineCriterionLabel(): string {
    return this.starWineService.criterionLabel(this.starWineService.result.criterion);
  }

  goToStarWineSettings(): void {
    void this.router.navigate(['/settings/star-wine']);
  }

  get regionEntries(): RegionDistribution[] {
    return this.stats.regions;
  }

  /** Valeur de la cave en notation compacte (« 1,2k »), selon la langue active. */
  get formattedTotalValue(): string {
    return this.format({ notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 2 }, this.stats.totalValue)
      .replace(/\s/g, '');
  }

  /** Taux de remplissage de la cave, avec deux décimales (« 12,50 »). */
  get wineCaveFillPercentage(): string {
    const percentage = fillPercentage(this.totalBottles, this.caveService.totalCapacity);
    return this.format({ minimumFractionDigits: 2, maximumFractionDigits: 2 }, percentage);
  }

  distributionEntries(): [WineType, number][] {
    return this.stats.distributionEntries;
  }

  distributionPercentage(count: number): number {
    return percentageOf(count, this.totalBottles);
  }

  regionTypePercentage(regionBottles: number, typeBottles: number): number {
    return percentageOf(typeBottles, regionBottles);
  }

  wineTypeColor(type: WineType): string {
    const colorSuffix = WINE_TYPE_CONFIG[type].gradientColor === 'accent' ? '-accent' : '';
    return `var(--wine-${type}${colorSuffix})`;
  }

  openSheet(): void {
    this.isSheetOpen = !this.isSheetOpen;
  }

  goToCave(): void {
    void this.router.navigate(['/cave']);
  }

  goToCatalogue(): void {
    if (this.features.catalogue) void this.router.navigate(['/catalogue']);
  }

  private format(options: Intl.NumberFormatOptions, value: number): string {
    const locale = this.transloco.getActiveLang();
    const key = `${locale}|${JSON.stringify(options)}`;

    let formatter = this.numberFormats.get(key);
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, options);
      this.numberFormats.set(key, formatter);
    }
    return formatter.format(value);
  }
}
