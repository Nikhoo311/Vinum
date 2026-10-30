import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertController, IonicModule } from '@ionic/angular';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { combineLatest } from 'rxjs';

import { AddWineFormComponent } from '../components/add-wine-form/add-wine-form.component';
import { CustomModalComponent } from '../components/custom-modal/custom-modal.component';
import { ProposalStatusCardComponent } from '../components/proposal-status-card/proposal-status-card.component';
import { TopbarBackButtonComponent } from '../components/topbar-back-button/topbar-back-button.component';
import { WineSheetModalComponent } from '../components/wine-sheet-modal/wine-sheet-modal.component';
import { createWineForm, emptyWineFormValue, wineDetailsFromForm, wineFormValueFrom } from '../core/forms/wine-form';
import { CatalogueProposal, CatalogueWineData } from '../core/models/catalogue-wine.model';
import { UserWine } from '../core/models/wine.model';
import { AuthService } from '../core/services/auth.service';
import { CatalogueService } from '../core/services/catalogue.service';
import { ToastService } from '../core/services/toast.service';
import { WINE_TYPE_CONFIG, WineType } from '../core/types/WineType';
import { proposalToUserWine } from '../core/utils/catalogue.util';

type ProposalStatusTab = 'pending' | 'processed';

@Component({
  selector: 'app-my-proposals',
  standalone: true,
  templateUrl: './my-proposals.page.html',
  styleUrls: ['./my-proposals.page.scss'],
  imports: [
    CommonModule,
    IonicModule,
    TranslocoModule,
    ReactiveFormsModule,
    AddWineFormComponent,
    CustomModalComponent,
    ProposalStatusCardComponent,
    TopbarBackButtonComponent,
    WineSheetModalComponent,
  ],
})
export class MyProposalsPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly catalogue = inject(CatalogueService);
  private readonly toast = inject(ToastService);
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly WINE_TYPE_CONFIG = WINE_TYPE_CONFIG;
  readonly wineForm = createWineForm(inject(FormBuilder));

  proposals: CatalogueProposal[] = [];
  selectedProposal: CatalogueProposal | null = null;
  tab: ProposalStatusTab = 'pending';
  proposalOpen = false;
  proposalResubmission = false;
  saving = false;
  private userId = '';
  private highlightedProposalIds: string[] = [];

  ngOnInit(): void {
    combineLatest([this.auth.currentUser$, this.catalogue.userProposals$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([user, proposals]) => {
        const userId = user?.id ?? '';
        if (this.userId !== userId) {
          this.userId = userId;
          this.highlightedProposalIds = [...this.loadHighlightedProposalIds()];
        }
        this.proposals = proposals;
        if (this.selectedProposal) {
          this.selectedProposal = proposals.find(({ id }) => id === this.selectedProposal?.id) ?? null;
        }
      });
  }

  get visibleProposals(): CatalogueProposal[] {
    return this.proposals.filter((proposal) =>
      this.tab === 'pending' ? proposal.status === 'pending' : proposal.status !== 'pending'
    );
  }

  get pendingCount(): number {
    return this.proposals.filter((proposal) => proposal.status === 'pending').length;
  }

  get processedCount(): number {
    return this.proposals.length - this.pendingCount;
  }

  get unseenProposalUpdateCount(): number {
    return this.loadUnseenProposalUpdateIds().size;
  }

  get selectedProposalWine(): UserWine | null {
    return this.selectedProposal ? proposalToUserWine(this.selectedProposal) : null;
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Intl.DateTimeFormat(this.transloco.getActiveLang(), { dateStyle: 'medium' }).format(new Date(date));
  }

  setTab(tab: ProposalStatusTab): void {
    if (tab === 'processed' && this.tab !== 'processed') {
      const unseenIds = this.loadUnseenProposalUpdateIds();
      this.highlightedProposalIds = this.hasVisitedProcessedTab()
        ? [...unseenIds]
        : [...new Set([...this.highlightedProposalIds, ...unseenIds])];
      this.saveHighlightedProposalIds();
      this.markProposalUpdatesSeen(unseenIds);
      this.saveProcessedTabVisited();
    }
    this.tab = tab;
    this.selectedProposal = null;
  }

  isProposalHighlighted(proposalId: string): boolean {
    return this.highlightedProposalIds.includes(proposalId);
  }

  openProposal(proposal: CatalogueProposal): void {
    this.selectedProposal = proposal;
  }

  closeProposal(): void {
    this.selectedProposal = null;
  }

  async cancelProposal(proposal: CatalogueProposal): Promise<void> {
    const alert = await this.alertController.create({
      mode: 'ios',
      header: this.transloco.translate('CATALOGUE.MY_PROPOSALS.CANCEL_TITLE'),
      message: this.transloco.translate('CATALOGUE.MY_PROPOSALS.CANCEL_CONFIRM'),
      buttons: [
        { text: this.transloco.translate('COMMON.CANCEL'), role: 'cancel' },
        { text: this.transloco.translate('CATALOGUE.MY_PROPOSALS.CANCEL_ACTION'), role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    try {
      await this.catalogue.cancelProposal(proposal.id);
      this.selectedProposal = null;
      void this.toast.success(this.transloco.translate('CATALOGUE.MY_PROPOSALS.CANCEL_SUCCESS'));
    } catch (error) {
      console.error('Retrait de la proposition impossible :', error);
      void this.toast.error(this.transloco.translate('CATALOGUE.MY_PROPOSALS.ACTION_ERROR'));
    }
  }

  resendProposal(proposal: CatalogueProposal): void {
    this.selectedProposal = null;
    this.resetForm(proposal);
    this.proposalResubmission = true;
    this.proposalOpen = true;
  }

  startProposal(): void {
    this.resetForm();
    this.proposalOpen = true;
  }

  closeProposalForm(): void {
    this.proposalOpen = false;
    this.proposalResubmission = false;
  }

  async submitProposal(): Promise<void> {
    if (this.saving) return;
    if (!this.userId || this.wineForm.invalid) {
      this.wineForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    try {
      const details = wineDetailsFromForm(this.wineForm.getRawValue());
      const wineData: CatalogueWineData = { ...details, grapeVariety: details.grapeVariety ?? '' };
      await this.catalogue.submitProposal(wineData);
      this.proposalOpen = false;
      const successKey = this.proposalResubmission
        ? 'CATALOGUE.MY_PROPOSALS.RESEND_SUCCESS'
        : 'CATALOGUE.PROPOSAL_SUCCESS';
      this.proposalResubmission = false;
      void this.toast.success(this.transloco.translate(successKey));
    } catch (error) {
      console.error("Envoi de la proposition impossible :", error);
      void this.toast.error(this.transloco.translate('CATALOGUE.PROPOSAL_ERROR'));
    } finally {
      this.saving = false;
    }
  }

  private resetForm(proposal?: CatalogueProposal): void {
    if (proposal) {
      this.wineForm.reset({ ...wineFormValueFrom(proposalToUserWine(proposal)), quantity: 1 });
      return;
    }

    const defaultPairing = WINE_TYPE_CONFIG[WineType.RED].defaultFoodPairing
      .map((key) => this.transloco.translate(key))
      .join(', ');
    this.wineForm.reset(emptyWineFormValue(defaultPairing));
  }

  private loadUnseenProposalUpdateIds(): Set<string> {
    if (!this.userId) return new Set();
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(`catalogue-proposal-seen-${this.userId}`) ?? '[]');
      const seenIds = new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []);
      return new Set(
        this.proposals
          .filter((proposal) => proposal.status !== 'pending' && !seenIds.has(proposal.id))
          .map(({ id }) => id)
      );
    } catch (error) {
      console.error('Lecture des changements de propositions impossibles :', error);
      return new Set();
    }
  }

  private markProposalUpdatesSeen(unseenIds: ReadonlySet<string>): void {
    if (!this.userId || !unseenIds.size) return;
    try {
      localStorage.setItem(
        `catalogue-proposal-seen-${this.userId}`,
        JSON.stringify([...unseenIds, ...this.getSeenProposalUpdateIds()])
      );
    } catch (error) {
      console.error('Enregistrement des propositions consultées impossible :', error);
    }
  }

  private getSeenProposalUpdateIds(): Set<string> {
    if (!this.userId) return new Set();
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(`catalogue-proposal-seen-${this.userId}`) ?? '[]');
      return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []);
    } catch (error) {
      console.error('Lecture des propositions consultées impossible :', error);
      return new Set();
    }
  }

  private loadHighlightedProposalIds(): Set<string> {
    if (!this.userId) return new Set();
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem(`catalogue-proposal-highlight-${this.userId}`) ?? '[]'
      );
      return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []);
    } catch (error) {
      console.error('Lecture des propositions à signaler impossible :', error);
      return new Set();
    }
  }

  private saveHighlightedProposalIds(): void {
    if (!this.userId) return;
    try {
      localStorage.setItem(
        `catalogue-proposal-highlight-${this.userId}`,
        JSON.stringify(this.highlightedProposalIds)
      );
    } catch (error) {
      console.error('Enregistrement des propositions à signaler impossible :', error);
    }
  }

  private hasVisitedProcessedTab(): boolean {
    if (!this.userId) return false;
    try {
      return localStorage.getItem(`catalogue-proposal-processed-visited-${this.userId}`) === 'true';
    } catch (error) {
      console.error('Lecture de la consultation des propositions traitées impossible :', error);
      return false;
    }
  }

  private saveProcessedTabVisited(): void {
    if (!this.userId) return;
    try {
      localStorage.setItem(`catalogue-proposal-processed-visited-${this.userId}`, 'true');
    } catch (error) {
      console.error('Enregistrement de la consultation des propositions traitées impossible :', error);
    }
  }
}
