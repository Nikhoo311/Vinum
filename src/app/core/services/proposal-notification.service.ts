import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TranslocoService } from '@jsverse/transloco';
import { EMPTY, catchError, combineLatest, concatMap, debounceTime, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CatalogueProposal, CatalogueProposalStatus } from '../models/catalogue-wine.model';
import { AuthService } from './auth.service';
import { CatalogueService } from './catalogue.service';
import { PreferencesService } from './preferences.service';

const SEEN_PROPOSAL_STATUSES_KEY_PREFIX = 'catalogue-proposal-notification-status-';

/** Notifications locales lors d'un changement d'état des propositions de l'utilisateur. */
@Injectable({ providedIn: 'root' })
export class ProposalNotificationService {
  private readonly auth = inject(AuthService);
  private readonly catalogue = inject(CatalogueService);
  private readonly prefs = inject(PreferencesService);
  private readonly transloco = inject(TranslocoService);

  private started = false;

  start(): void {
    if (this.started || !environment.features.catalogue || !Capacitor.isNativePlatform()) return;
    this.started = true;

    this.auth.currentUser$
      .pipe(
        map((user) => user?.id ?? ''),
        distinctUntilChanged(),
        switchMap((uid) => uid
          ? combineLatest([
              this.catalogue.userProposals$,
              this.prefs.preferences$.pipe(
                map((preferences) => preferences.notificationsEnabled),
                distinctUntilChanged(),
              ),
            ]).pipe(map(([proposals, enabled]) => ({ uid, proposals, enabled })))
          : of({ uid: '', proposals: [] as CatalogueProposal[], enabled: false })),
        debounceTime(500),
        concatMap(({ uid, proposals, enabled }) =>
          from(this.sync(uid, proposals, enabled)).pipe(
            catchError((error) => {
              console.error('Notification de mise à jour des propositions impossible.', error);
              return EMPTY;
            }),
          ),
        ),
      )
      .subscribe();
  }

  private async sync(uid: string, proposals: readonly CatalogueProposal[], enabled: boolean): Promise<void> {
    if (!uid) return;

    const previousStatuses = this.loadStatuses(uid);
    const updates = proposals.filter((proposal) => {
      const previousStatus = previousStatuses.get(proposal.id);
      return previousStatus !== undefined && previousStatus !== proposal.status;
    });

    if (enabled && updates.length && (await LocalNotifications.checkPermissions()).display === 'granted') {
      const now = Date.now();
      await LocalNotifications.schedule({
        notifications: updates.map((proposal, index) => ({
          id: this.notificationId(uid, proposal),
          title: this.transloco.translate('NOTIFICATIONS.PROPOSAL.TITLE'),
          body: this.transloco.translate(this.bodyKey(proposal.status), { name: proposal.name }),
          schedule: { at: new Date(now + 1000 + index * 1000) },
          extra: { proposalId: proposal.id, status: proposal.status },
        })),
      });
    }

    this.saveStatuses(uid, proposals);
  }

  private bodyKey(status: CatalogueProposalStatus): string {
    switch (status) {
      case 'approved':
        return 'NOTIFICATIONS.PROPOSAL.APPROVED';
      case 'rejected':
        return 'NOTIFICATIONS.PROPOSAL.REJECTED';
      case 'pending':
        return 'NOTIFICATIONS.PROPOSAL.PENDING';
    }
  }

  private notificationId(uid: string, proposal: CatalogueProposal): number {
    const value = `${uid}:${proposal.id}:${proposal.status}:${proposal.moderatedAt ?? ''}`;
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
    }
    return (hash & 0x7fffffff) || 1;
  }

  private loadStatuses(uid: string): Map<string, CatalogueProposalStatus> {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(SEEN_PROPOSAL_STATUSES_KEY_PREFIX + uid) ?? '{}');
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        console.error('Historique des statuts de propositions invalide dans le stockage local.');
        return new Map();
      }

      return new Map(
        Object.entries(raw).filter((entry): entry is [string, CatalogueProposalStatus] =>
          ['pending', 'approved', 'rejected'].includes(String(entry[1]))
        )
      );
    } catch (error) {
      console.error('Lecture de l’historique des statuts de propositions impossible :', error);
      return new Map();
    }
  }

  private saveStatuses(uid: string, proposals: readonly CatalogueProposal[]): void {
    try {
      localStorage.setItem(
        SEEN_PROPOSAL_STATUSES_KEY_PREFIX + uid,
        JSON.stringify(Object.fromEntries(proposals.map(({ id, status }) => [id, status])))
      );
    } catch (error) {
      console.error('Enregistrement de l’historique des statuts de propositions impossible :', error);
      throw error;
    }
  }
}
