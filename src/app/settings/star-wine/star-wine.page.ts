import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';

import { StarWineService, starWineKey } from '../../core/services/star-wine.service';
import { WINE_TYPE_CONFIG } from '../../core/types/WineType';
import { RankedWine, STAR_WINE_GROUPS, StarWineCriterion } from '../../core/utils/star-wine.util';

/** Icône de chaque critère (doivent être enregistrées dans `core/icons.ts`). */
const CRITERION_ICONS: Record<StarWineCriterion, string> = {
  price: 'pricetag-outline',
  'cellar-value': 'layers-outline',
  'oldest-vintage': 'hourglass-outline',
  'best-rated': 'star-outline',
  'best-value': 'scale-outline',
  'longest-in-cellar': 'time-outline',
  'biggest-stock': 'grid-outline',
};

/** Réglage du « vin star » : choix du critère, avec aperçu immédiat du vin désigné. */
@Component({
  selector: 'app-star-wine',
  standalone: true,
  templateUrl: './star-wine.page.html',
  styleUrls: ['./star-wine.page.scss'],
  imports: [CommonModule, IonicModule, TranslocoModule],
})
export class StarWinePage implements OnInit {
  private readonly location = inject(Location);
  private readonly starWine = inject(StarWineService);

  readonly groups = STAR_WINE_GROUPS;
  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;
  readonly icons = CRITERION_ICONS;
  readonly keyOf = starWineKey;

  ngOnInit(): void {
    this.starWine.markSeen();
  }

  get criterion(): StarWineCriterion {
    return this.starWine.criterion;
  }

  get star(): RankedWine | null {
    return this.starWine.result.ranking[0] ?? null;
  }

  /** Le critère choisi ne retient aucun vin : le vin affiché vient du critère par défaut. */
  get isFallback(): boolean {
    return this.starWine.result.fellBack;
  }

  describe(entry: RankedWine): string {
    return this.starWine.describe(entry, this.starWine.result.criterion);
  }

  select(criterion: StarWineCriterion): void {
    void this.starWine.setCriterion(criterion);
  }

  goBack(): void {
    this.location.back();
  }
}
