import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, input, output, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';

import { SearchableItem, searchItems } from '../../core/utils/search.util';

export type { SearchableItem } from '../../core/utils/search.util';

/** Délai (ms) entre la dernière frappe et le lancement de la recherche. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Barre de recherche avec résumé des résultats.
 * Le composant n'applique aucun filtre lui-même : il émet la requête (`queryChange`)
 * et son parent décide quoi afficher, avec la même fonction {@link searchItems}.
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, IonicModule, TranslocoPipe],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
})
export class SearchBarComponent implements OnDestroy {
  items = input.required<SearchableItem[]>();
  queryChange = output<string>();

  query = signal('');
  private debounceTimer?: ReturnType<typeof setTimeout>;

  results = computed<SearchableItem[]>(() => searchItems(this.items(), this.query()));
  hasQuery = computed(() => this.query().trim().length > 0);

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
  }

  onInput(event: Event): void {
    const value = (event as CustomEvent<{ value?: string | null }>).detail.value ?? '';

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.setQuery(value), SEARCH_DEBOUNCE_MS);
  }

  clear(): void {
    clearTimeout(this.debounceTimer);
    this.setQuery('');
  }

  allResultTags(): string {
    return this.results()
      .map((item) => item.tag)
      .filter(Boolean)
      .join(', ');
  }

  totalPlacementCount(): number {
    return this.results().reduce((total, item) => total + (item.placementCount || 1), 0);
  }

  private setQuery(value: string): void {
    this.query.set(value);
    this.queryChange.emit(value);
  }
}
