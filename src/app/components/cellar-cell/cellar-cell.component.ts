import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, map } from 'rxjs';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { WINE_TYPE_CONFIG, WineType } from 'src/app/core/types/WineType';

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

  isDarkMode$!: Observable<boolean>;

  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;

  constructor(private prefs: PreferencesService) {
    this.isDarkMode$ = this.prefs.preferences$.pipe(map((p) => p.darkMode === 'dark'));
  }

  get isEmpty(): boolean {
    return this.wineType === null;
  }

  get bodyVar(): string {
    return this.wineType ? `color-mix(in srgb, var(--wine-${this.wineType}) 65%, transparent)` : '';
  }
}