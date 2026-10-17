import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { WINE_TYPE_CONFIG, WineType } from '../../core/types/WineType';

/** Case de la grille de la cave : vide (bouton « + ») ou occupée par une bouteille. */
@Component({
  selector: 'app-cellar-cell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cellar-cell.component.html',
  styleUrls: ['./cellar-cell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CellarCellComponent {
  @Input({ required: true }) positionLabel!: string;
  @Input() wineType: WineType | null = null;
  @Input() wineName: string | null = null;
  @Input() wineVintage: number | null = null;
  @Output() cellTap = new EventEmitter<void>();

  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;

  get isEmpty(): boolean {
    return this.wineType === null;
  }

  get bodyVar(): string {
    return this.wineType ? `color-mix(in srgb, var(--wine-${this.wineType}) 65%, transparent)` : '';
  }
}
