import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../core/services/auth.service';
import { Router } from '@angular/router';
import { User } from '../core/models/user.model';
import { CaveService } from '../core/services/cave.service';
import { WINE_TYPE_CONFIG, WineType } from '../core/types/WineType';
import { UserWine } from '../core/models/wine.model';
import { WineSheetModalComponent } from '../components/wine-sheet-modal/wine-sheet-modal.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslocoModule, WineSheetModalComponent],
})
export class HomePage implements OnInit {
  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;
  isSheetOpen: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private caveService: CaveService
  ) {}

  ngOnInit(): void {
    console.log('Vin Star initial :', this.starWine);
    console.log('Cave initiale :', this.caveService.cave);
  }


  get user(): User | null {
    return this.authService.currentUser;
  }

  get totalBottles(): number {
    return this.caveService.totalBottles;
  }

  get totalValue(): number {
    return this.caveService.totalValue;
  }

  get averageRating(): number {
    return this.caveService.averageRating;
  }

  get formattedTotalValue(): string {
    return new Intl.NumberFormat('fr-FR', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 2,
    }).format(this.totalValue).replace(/\s/g, '');
  }

  get starWine(): UserWine {
    return this.caveService.starWine;
  }

  get wineCaveFillPercentage(): string {
    const totalSlots = this.caveService.totalCapacity;
    const percentage = totalSlots > 0 ? (this.totalBottles / totalSlots) * 100 : 0;
    return percentage.toFixed(2)
  }

  get distributionByType(): Record<WineType, number> {
    const allTypes = Object.keys(this.WINE_TYPE_CONFIG) as WineType[];
    return this.caveService.getDistributionBy('type', allTypes);
  }

  distributionEntries(): [WineType, number][] {
    return Object.entries(this.distributionByType) as [WineType, number][];
  }

  distributionPercentage(count: number): number {
    return this.totalBottles > 0 ? (count / this.totalBottles) * 100 : 0;
  }

  wineTypeColor(type: WineType): string {
    const colorSuffix = this.WINE_TYPE_CONFIG[type].gradientColor === 'accent' ? '-accent' : '';
    return `var(--wine-${type}${colorSuffix})`;
  }
  
  async logout() {
    await this.authService.logout();
    this.router.navigate(['/auth']);
  }

  openSheet(): void {
    this.isSheetOpen = !this.isSheetOpen;
  }

  goToCave(): void {
    this.router.navigate(['/cave']);
  }
}
