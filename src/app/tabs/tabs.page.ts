import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { Gesture, GestureController, IonTabs, IonicModule } from '@ionic/angular';
import type { GestureDetail } from '@ionic/core';
import { TranslocoModule } from '@jsverse/transloco';

import { environment } from '../../environments/environment';

/** Ordre des onglets, utilisé pour le balayage horizontal. */
const TAB_ORDER = ['home', 'cave', ...(environment.features.catalogue ? ['catalogue'] : []), 'settings'];

const SWIPE_DISTANCE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.2;

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslocoModule],
})
export class TabsPage implements AfterViewInit, OnDestroy {
  @ViewChild(IonTabs, { read: ElementRef }) tabsRef!: ElementRef<HTMLElement>;
  @ViewChild(IonTabs) tabs!: IonTabs;

  readonly features = environment.features;

  private readonly gestureCtrl = inject(GestureController);
  private gesture?: Gesture;

  ngAfterViewInit(): void {
    this.gesture = this.gestureCtrl.create({
      el: this.tabsRef.nativeElement,
      gestureName: 'swipe-tabs',
      threshold: 5,
      onEnd: (event) => void this.handleSwipeEnd(event),
    });
    this.gesture.enable();
  }

  ngOnDestroy(): void {
    this.gesture?.destroy();
  }

  private async handleSwipeEnd(event: GestureDetail): Promise<void> {
    if (
      Math.abs(event.deltaX) < SWIPE_DISTANCE_THRESHOLD ||
      Math.abs(event.velocityX) < SWIPE_VELOCITY_THRESHOLD
    ) {
      return;
    }

    const currentIndex = TAB_ORDER.indexOf((await this.tabs.getSelected()) ?? '');
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + (event.deltaX < 0 ? 1 : -1);
    const nextTab = TAB_ORDER[nextIndex];
    if (nextTab) this.tabs.select(nextTab);
  }
}
