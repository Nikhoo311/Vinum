import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-catalogue-search-tools',
  standalone: true,
  templateUrl: './catalogue-search-tools.component.html',
  styleUrls: ['./catalogue-search-tools.component.scss'],
  imports: [IonicModule],
})
export class CatalogueSearchToolsComponent {
  @Input() value = '';
  @Input() placeholder = '';
  @Input() filterCount = 0;
  @Input() filterLabel = '';

  @Output() readonly searchInput = new EventEmitter<Event>();
  @Output() readonly filterClick = new EventEmitter<void>();
}
