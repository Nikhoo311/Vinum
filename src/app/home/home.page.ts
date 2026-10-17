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
import { CaveService } from '../core/services/cave.service';
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

  private readonly authService = inject(AuthService);
  private readonly caveService = inject(CaveService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  private readonly numberFormats = new Map<string, Intl.NumberFormat>();

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
    return this.stats.starWine;
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
