import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertController, IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { CustomModalComponent } from '../../components/custom-modal/custom-modal.component';
import { CatalogueSearchToolsComponent } from '../../components/catalogue-search-tools/catalogue-search-tools.component';
import { TopbarBackButtonComponent } from '../../components/topbar-back-button/topbar-back-button.component';
import { ProposalStatusCardComponent } from '../../components/proposal-status-card/proposal-status-card.component';
import { AddWineFormComponent } from '../../components/add-wine-form/add-wine-form.component';
import { SelectComponent, SelectOption } from '../../components/select/select.component';
import { WineSheetModalComponent } from '../../components/wine-sheet-modal/wine-sheet-modal.component';
import {
  CatalogueProposal,
  CatalogueProposalDecision,
  CatalogueWine,
  CatalogueWineData,
} from '../../core/models/catalogue-wine.model';
import { CatalogueService } from '../../core/services/catalogue.service';
import { ToastService } from '../../core/services/toast.service';
import { WINE_TYPE_CONFIG, WINE_TYPES, WineType } from '../../core/types/WineType';
import { createWineForm, wineDetailsFromForm, wineFormValueFrom } from '../../core/forms/wine-form';
import { UserWine } from '../../core/models/wine.model';
import { proposalToUserWine } from '../../core/utils/catalogue.util';
import { normalizeSearchText } from '../../core/utils/search.util';
import { combineLatest } from 'rxjs';

type ReviewTab = 'pending' | 'processed';
type DecisionFilter = 'all' | 'approved' | 'rejected';
type ReviewSort = 'oldest' | 'newest' | 'name-asc' | 'name-desc';

@Component({
  selector: 'app-catalogue-proposals',
  standalone: true,
  templateUrl: './catalogue-proposals.page.html',
  styleUrls: ['./catalogue-proposals.page.scss'],
  imports: [
    CommonModule,
    IonicModule,
    TranslocoModule,
    CustomModalComponent,
    CatalogueSearchToolsComponent,
    TopbarBackButtonComponent,
    ProposalStatusCardComponent,
    AddWineFormComponent,
    SelectComponent,
    WineSheetModalComponent,
  ],
})
export class CatalogueProposalsPage implements OnInit {
  private readonly catalogue = inject(CatalogueService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly WINE_TYPES = WINE_TYPES;
  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;
  readonly editForm = createWineForm(this.fb);

  proposals: CatalogueProposal[] = [];
  communityWines: CatalogueWine[] = [];
  tab: ReviewTab = 'pending';
  decisionFilter: DecisionFilter = 'all';
  readonly sortControl = new FormControl<ReviewSort>('newest', { nonNullable: true });
  query = '';
  selectedTypes = new Set<WineType>();
  duplicateOnly = false;
  filtersOpen = false;
  selectedProposal: CatalogueProposal | null = null;
  editing = false;
  moderatingProposalId: string | null = null;
  private readonly proposalAuthorNames = new Map<string, string>();

  ngOnInit(): void {
    combineLatest([this.catalogue.allProposals$, this.catalogue.communityWines$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([proposals, wines]) => {
        this.proposals = proposals;
        this.communityWines = wines;
        void this.loadProposalAuthorNames(proposals);
        if (this.selectedProposal) {
          this.selectedProposal = proposals.find(({ id }) => id === this.selectedProposal?.id) ?? null;
        }
      });
  }

  get pendingCount(): number {
    return this.proposals.filter((proposal) => proposal.status === 'pending').length;
  }

  get processedCount(): number {
    return this.proposals.length - this.pendingCount;
  }

  get selectedProposalWine(): UserWine | null {
    return this.selectedProposal ? proposalToUserWine(this.selectedProposal) : null;
  }

  get sortOptions(): SelectOption[] {
    return [
      { value: 'newest', label: this.transloco.translate('CATALOGUE.ADMIN.NEWEST_FIRST') },
      { value: 'oldest', label: this.transloco.translate('CATALOGUE.ADMIN.OLDEST_FIRST') },
      { value: 'name-asc', label: this.transloco.translate('CATALOGUE.ADMIN.NAME_ASC') },
      { value: 'name-desc', label: this.transloco.translate('CATALOGUE.ADMIN.NAME_DESC') },
    ];
  }

  get visibleProposals(): CatalogueProposal[] {
    const search = normalizeSearchText(this.query);
    return this.proposals
      .filter((proposal) => this.tab === 'pending'
        ? proposal.status === 'pending'
        : proposal.status !== 'pending' && (this.decisionFilter === 'all' || proposal.status === this.decisionFilter))
      .filter((proposal) => !this.selectedTypes.size || this.selectedTypes.has(proposal.type))
      .filter((proposal) => !this.duplicateOnly || !!this.findDuplicate(proposal))
      .filter((proposal) => !search || normalizeSearchText(
        [proposal.name, proposal.domain, proposal.region, proposal.grapeVariety, this.proposalAuthorName(proposal)].join(' ')
      ).includes(search))
      .sort((a, b) => {
        const sort = this.sortControl.value;
        if (sort === 'name-asc' || sort === 'name-desc') {
          const order = a.name.localeCompare(b.name, this.transloco.getActiveLang(), { sensitivity: 'base', numeric: true });
          return sort === 'name-asc' ? order : -order;
        }
        const order = (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
        return sort === 'oldest' ? order : -order;
      });
  }

  get activeFilterCount(): number {
    return this.selectedTypes.size
      + Number(this.decisionFilter !== 'all')
      + Number(this.duplicateOnly)
      + Number(this.sortControl.value !== 'newest');
  }

  get hasActiveCriteria(): boolean {
    return this.query.trim() !== '' || this.activeFilterCount > 0;
  }

  setTab(tab: ReviewTab): void {
    this.tab = tab;
    this.selectedProposal = null;
    this.editing = false;
  }

  onSearch(event: Event): void {
    this.query = (event.target as HTMLIonSearchbarElement).value ?? '';
  }

  openProposal(proposal: CatalogueProposal): void {
    this.markProposalViewed(proposal);
    this.selectedProposal = proposal;
    this.editing = false;
  }

  closeProposal(): void {
    this.selectedProposal = null;
    this.editing = false;
  }

  proposalAuthorName(proposal: CatalogueProposal): string {
    return this.proposalAuthorNames.get(proposal.ownerId) ?? '';
  }

  typeColor(type: WineType): string {
    return WINE_TYPE_CONFIG[type].gradientColor === 'accent' ? `var(--wine-${type}-accent)` : `var(--wine-${type})`;
  }

  findDuplicate(proposal: CatalogueProposal): CatalogueWine | undefined {
    const name = normalizeSearchText(proposal.name);
    const vintage = normalizeSearchText(String(proposal.vintage));
    return this.communityWines.find((wine) =>
      normalizeSearchText(wine.name) === name && normalizeSearchText(String(wine.vintage)) === vintage
    );
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Intl.DateTimeFormat(this.transloco.getActiveLang(), { dateStyle: 'medium' }).format(new Date(date));
  }

  toggleType(type: WineType): void {
    if (!this.selectedTypes.delete(type)) this.selectedTypes.add(type);
  }

  resetFilters(): void {
    this.query = '';
    this.selectedTypes.clear();
    this.decisionFilter = 'all';
    this.duplicateOnly = false;
    this.sortControl.setValue('newest');
  }

  async acceptProposal(proposal: CatalogueProposal): Promise<void> {
    const alert = await this.alertController.create({
      cssClass: 'accept-proposal-alert',
      mode: 'ios',
      header: this.transloco.translate('CATALOGUE.ADMIN.ACCEPT_TITLE'),
      message: this.transloco.translate('CATALOGUE.ADMIN.ACCEPT_CONFIRM', { name: proposal.name }),
      buttons: [
        { text: this.transloco.translate('COMMON.CANCEL'), role: 'cancel' },
        { text: this.transloco.translate('CATALOGUE.ADMIN.ACCEPT'), role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'destructive') await this.moderate(proposal, 'approved');
  }

  async rejectProposal(proposal: CatalogueProposal): Promise<void> {
    let rejectionReason = '';
    const alert = await this.alertController.create({
      mode: 'ios',
      header: this.transloco.translate('CATALOGUE.ADMIN.REJECT_TITLE'),
      message: this.transloco.translate('CATALOGUE.ADMIN.REJECT_HINT'),
      inputs: [{
        name: 'reason',
        type: 'textarea',
        placeholder: this.transloco.translate('CATALOGUE.ADMIN.REJECTION_REASON'),
        attributes: { maxlength: 1000 },
      }],
      buttons: [
        { text: this.transloco.translate('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.transloco.translate('CATALOGUE.ADMIN.REJECT'),
          role: 'destructive',
          handler: (values: { reason?: unknown }) => {
            rejectionReason = typeof values.reason === 'string' ? values.reason : '';
          },
        },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'destructive') await this.moderate(proposal, 'rejected', rejectionReason);
  }

  async requeueProposal(proposal: CatalogueProposal): Promise<void> {
    if (this.moderatingProposalId) return;

    const wasPublished = proposal.status === 'approved';
    const alert = await this.alertController.create({
      cssClass: 'requeue-proposal-alert',
      mode: 'ios',
      header: this.transloco.translate('CATALOGUE.ADMIN.REQUEUE_TITLE'),
      message: this.transloco.translate(
        wasPublished ? 'CATALOGUE.ADMIN.REQUEUE_PUBLISHED_CONFIRM' : 'CATALOGUE.ADMIN.REQUEUE_CONFIRM',
        { name: proposal.name }
      ),
      buttons: [
        { text: this.transloco.translate('COMMON.CANCEL'), role: 'cancel' },
        { text: this.transloco.translate('CATALOGUE.ADMIN.REQUEUE_CONFIRM_ACTION'), role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    this.moderatingProposalId = proposal.id;
    try {
      await this.catalogue.requeueProposal(proposal.id);
      this.tab = 'pending';
      this.editing = false;
      const pendingProposal = { ...proposal, status: 'pending' as const };
      delete pendingProposal.moderatedBy;
      delete pendingProposal.moderatedAt;
      delete pendingProposal.rejectionReason;
      this.selectedProposal = pendingProposal;
      void this.toast.success(this.transloco.translate('CATALOGUE.ADMIN.REQUEUE_SUCCESS'));
    } catch (error) {
      console.error('Remise en attente de la proposition impossible :', error);
      void this.toast.error(this.transloco.translate('CATALOGUE.ADMIN.MODERATION_ERROR'));
    } finally {
      this.moderatingProposalId = null;
    }
  }

  startEditing(proposal: CatalogueProposal): void {
    this.editForm.reset(wineFormValueFrom(proposalToUserWine(proposal)));
    this.editing = true;
  }

  async publishCorrections(proposal: CatalogueProposal): Promise<void> {
    if (this.moderatingProposalId) return;
    const requiredFields = [
      ['type', 'CATALOGUE.TYPE'],
      ['name', 'CAVE.ADD_WINE.NAME'],
      ['domain', 'CAVE.ADD_WINE.DOMAIN'],
      ['vintage', 'CAVE.ADD_WINE.VINTAGE'],
      ['region', 'CAVE.ADD_WINE.REGION'],
      ['grapeVariety', 'CAVE.ADD_WINE.GRAPE_VARIETY'],
      ['unitPrice', 'CAVE.ADD_WINE.UNIT_PRICE'],
    ] as const;
    const invalidFields = requiredFields.filter(([controlName]) => {
      const control = this.editForm.controls[controlName];
      control.markAsTouched();
      return control.invalid;
    });
    if (invalidFields.length) {
      const fieldNames = invalidFields
        .map(([, labelKey]) => this.transloco.translate(labelKey))
        .join(', ');
      void this.toast.error(this.transloco.translate('CATALOGUE.ADMIN.PUBLISH_FORM_INVALID', { fields: fieldNames }));
      return;
    }

    const edited = wineDetailsFromForm(this.editForm.getRawValue());
    const optionalFields = [
      ['rating', 'rating'],
      ['peakMaturityYear', 'peakMaturityYear'],
      ['description', 'description'],
      ['foodPairing', 'foodPairing'],
    ] as const;
    const invalidOptionalFields = new Set<string>();
    for (const [controlName] of optionalFields) {
      if (this.editForm.controls[controlName].invalid) invalidOptionalFields.add(controlName);
    }
    if (invalidOptionalFields.has('rating')) delete edited.rating;
    if (invalidOptionalFields.has('peakMaturityYear')) delete edited.peakMaturityYear;
    if (invalidOptionalFields.has('description')) edited.description = proposal.description ?? '';
    if (invalidOptionalFields.has('foodPairing')) edited.foodPairing = proposal.foodPairing ?? [];

    const correctedWine: CatalogueWineData = {
      ...this.proposalData(proposal),
      ...edited,
    };
    if (!invalidOptionalFields.has('rating') && edited.rating === undefined) delete correctedWine.rating;
    if (!invalidOptionalFields.has('peakMaturityYear') && edited.peakMaturityYear === undefined) {
      delete correctedWine.peakMaturityYear;
    }

    if (await this.moderate(proposal, 'approved', undefined, correctedWine)) this.editing = false;
  }

  private async moderate(
    proposal: CatalogueProposal,
    decision: CatalogueProposalDecision,
    reason?: string,
    correctedWine?: CatalogueWineData
  ): Promise<boolean> {
    if (this.moderatingProposalId) return false;
    this.moderatingProposalId = proposal.id;
    try {
      await this.catalogue.moderateProposal(proposal.id, decision, reason, correctedWine);
      void this.toast.success(this.transloco.translate(
        decision === 'approved' ? 'CATALOGUE.ADMIN.ACCEPT_SUCCESS' : 'CATALOGUE.ADMIN.REJECT_SUCCESS'
      ));
      return true;
    } catch (error) {
      console.error('Modération de la proposition impossible :', error);
      void this.toast.error(this.transloco.translate('CATALOGUE.ADMIN.MODERATION_ERROR'));
      return false;
    } finally {
      this.moderatingProposalId = null;
    }
  }

  private async loadProposalAuthorNames(proposals: readonly CatalogueProposal[]): Promise<void> {
    const ownerIds = [...new Set(proposals.map(({ ownerId }) => ownerId))]
      .filter((ownerId) => !this.proposalAuthorNames.has(ownerId));
    if (!ownerIds.length) return;

    try {
      const names = await this.catalogue.loadProposalAuthorNames(ownerIds);
      for (const [ownerId, name] of names) this.proposalAuthorNames.set(ownerId, name);
    } catch (error) {
      console.error('Lecture des noms des auteurs de propositions impossible :', error);
      void this.toast.error(this.transloco.translate('ERRORS.GENERIC'));
    }
  }

  private markProposalViewed(proposal: CatalogueProposal): void {
    if (proposal.status !== 'pending') return;
    try {
      this.catalogue.markProposalAsViewed(proposal.id);
    } catch (error) {
      console.error('Enregistrement de la consultation de la proposition impossible :', error);
      void this.toast.error(this.transloco.translate('ERRORS.GENERIC'));
    }
  }

  private proposalData(proposal: CatalogueProposal): CatalogueWineData {
    return {
      name: proposal.name,
      domain: proposal.domain,
      region: proposal.region,
      vintage: proposal.vintage,
      type: proposal.type,
      grapeVariety: proposal.grapeVariety,
      unitPrice: proposal.unitPrice,
      ...(proposal.description === undefined ? {} : { description: proposal.description }),
      ...(proposal.foodPairing === undefined ? {} : { foodPairing: proposal.foodPairing }),
      ...(proposal.rating === undefined ? {} : { rating: proposal.rating }),
      ...(proposal.peakMaturityYear === undefined ? {} : { peakMaturityYear: proposal.peakMaturityYear }),
    };
  }
}
