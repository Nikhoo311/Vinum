import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';

import { CatalogueProposalStatus } from '../../core/models/catalogue-wine.model';

@Component({
  selector: 'app-proposal-status-card',
  standalone: true,
  templateUrl: './proposal-status-card.component.html',
  styleUrls: ['./proposal-status-card.component.scss'],
  imports: [CommonModule, IonicModule, TranslocoModule],
})
export class ProposalStatusCardComponent {
  @Input({ required: true }) status!: CatalogueProposalStatus;
  @Input() createdAt?: string;
  @Input() rejectionReason?: string;
  @Input() author?: string;
  @Input() compact = false;

  get statusLabelKey(): string {
    return `CATALOGUE.MY_PROPOSALS.STATUS.${this.status.toUpperCase()}`;
  }
}
