import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { GestureController, Gesture, IonicModule, IonTabs } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';

const TAB_ORDER = ['home', 'cave', 'catalogue', 'settings'];

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    TranslocoModule,
  ]
})
export class TabsPage implements AfterViewInit, OnDestroy {
  @ViewChild(IonTabs, { read: ElementRef }) tabsRef!: ElementRef;
  @ViewChild(IonTabs) tabs!: IonTabs;

  private gesture?: Gesture;

  constructor(private gestureCtrl: GestureController) {}

  ngAfterViewInit(): void {
    this.gesture = this.gestureCtrl.create({
      el: this.tabsRef.nativeElement,
      gestureName: 'swipe-tabs',
      threshold: 5,
      onEnd: (ev) => { this.handleSwipeEnd(ev); },
    });
    this.gesture.enable();
  }

  ngOnDestroy(): void {
    this.gesture?.destroy();
  }

  private async handleSwipeEnd(ev: any): Promise<void> {
    const SWIPE_DISTANCE_THRESHOLD = 50;
    const SWIPE_VELOCITY_THRESHOLD = 0.2;

    if (Math.abs(ev.deltaX) < SWIPE_DISTANCE_THRESHOLD || Math.abs(ev.velocityX) < SWIPE_VELOCITY_THRESHOLD) {
      return;
    }

    const currentTab = await this.tabs.getSelected();
    const currentIndex = TAB_ORDER.indexOf(currentTab ?? '');
    if (currentIndex === -1) return;

    if (ev.deltaX < 0 && currentIndex < TAB_ORDER.length - 1) {
      this.tabs.select(TAB_ORDER[currentIndex + 1]);
    } else if (ev.deltaX > 0 && currentIndex > 0) {
      this.tabs.select(TAB_ORDER[currentIndex - 1]);
    }
  }
}
