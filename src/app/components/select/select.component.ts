import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';

export interface SelectOption {
  value: string;
  label: string;
}

let nextSelectId = 0;

/**
 * Liste de sélection (une valeur) entièrement maison : le déclencheur ressemble aux champs de saisie
 * et la liste s'ouvre juste dessous, dans la page. Elle ne dépend d'aucune popover Ionic, qui se
 * positionnait mal dans les modales à crans (liste coupée, mal alignée, derrière la modale).
 * Clavier : Entrée / Espace / ↓ ouvrent, ↑ ↓ naviguent, Entrée choisit, Échap ferme.
 */
@Component({
  selector: 'app-select',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
})
export class SelectComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() label = '';
  @Input() value = '';
  @Input() placeholder = '';
  @Input() options: SelectOption[] = [];
  @Output() valueChange = new EventEmitter<string>();

  readonly id = `app-select-${nextSelectId++}`;
  readonly listId = `${this.id}-list`;

  isOpen = false;
  activeIndex = -1;

  get selectedLabel(): string {
    return this.options.find((option) => option.value === this.value)?.label ?? '';
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this.options.length === 0) return;
    this.isOpen = true;
    this.activeIndex = Math.max(0, this.options.findIndex((option) => option.value === this.value));
    this.scrollToActive();
  }

  close(): void {
    this.isOpen = false;
    this.activeIndex = -1;
  }

  choose(option: SelectOption): void {
    this.close();
    if (option.value !== this.value) this.valueChange.emit(option.value);
  }

  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.isOpen) return this.open();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.activeIndex = (this.activeIndex + step + this.options.length) % this.options.length;
        this.scrollToActive();
        return;
      }
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.isOpen) return this.open();
        if (this.options[this.activeIndex]) this.choose(this.options[this.activeIndex]);
        return;
      case 'Escape':
        if (this.isOpen) {
          event.stopPropagation();
          this.close();
        }
        return;
      case 'Tab':
        this.close();
        return;
    }
  }

  /** Ferme la liste au clic (ou au toucher) en dehors du composant. */
  @HostListener('document:pointerdown', ['$event'])
  onOutsidePointer(event: Event): void {
    if (this.isOpen && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  private scrollToActive(): void {
    // Après le rendu : garde l'option active visible dans la liste, et la liste visible dans la modale.
    setTimeout(() => {
      const root = this.host.nativeElement;
      root.querySelector('.select__option--active')?.scrollIntoView({ block: 'nearest' });
      root.querySelector('.select__list')?.scrollIntoView({ block: 'nearest' });
    });
  }
}
