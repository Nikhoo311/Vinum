import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { SearchBarComponent, SearchableItem } from './search-bar.component';

describe('SearchBarComponent', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;

  const ITEMS: SearchableItem[] = [
    { id: '1', label: 'Chablis 1er Cru', subtitle: 'Domaine Laroche · 2021', tag: 'A1', keywords: ['Bourgogne', 'white'] },
    { id: '2', label: 'Château Margaux', subtitle: 'Château Margaux · 2017', tag: 'B2', keywords: ['Bordeaux', 'red'] },
  ];

  const typeQuery = (value: string) => component.onInput(new CustomEvent('ionInput', { detail: { value } }));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBarComponent, TranslocoTestingModule.forRoot({ langs: { fr: {} }, translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' } })],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();
  });

  it('crée le composant sans requête active', () => {
    expect(component).toBeTruthy();
    expect(component.hasQuery()).toBeFalse();
  });

  it('émet la requête après le délai de debounce uniquement', fakeAsync(() => {
    const emitted: string[] = [];
    component.queryChange.subscribe((value) => emitted.push(value));

    typeQuery('mar');
    tick(100);
    expect(emitted).toEqual([]);

    tick(300);
    expect(emitted).toEqual(['mar']);
    expect(component.results().map((item) => item.id)).toEqual(['2']);
  }));

  it('ne conserve que la dernière frappe', fakeAsync(() => {
    const emitted: string[] = [];
    component.queryChange.subscribe((value) => emitted.push(value));

    typeQuery('c');
    tick(100);
    typeQuery('chab');
    tick(300);

    expect(emitted).toEqual(['chab']);
  }));

  it('clear() réinitialise immédiatement la requête', fakeAsync(() => {
    typeQuery('chab');
    tick(300);
    expect(component.hasQuery()).toBeTrue();

    component.clear();
    expect(component.hasQuery()).toBeFalse();
  }));
});
