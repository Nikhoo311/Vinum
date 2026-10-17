import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';

import { PreferencesService } from '../../core/services/preferences.service';
import { LANGUAGE_CONFIG, LanguageInfo } from '../../core/types/LanguageConfig';

@Component({
  selector: 'app-language',
  standalone: true,
  templateUrl: './language.page.html',
  styleUrls: ['./language.page.scss'],
  imports: [CommonModule, IonicModule, TranslocoModule],
})
export class LanguagePage implements OnInit {
  languages: LanguageInfo[] = [];
  selectedLanguage = '';

  private readonly prefs = inject(PreferencesService);
  private readonly location = inject(Location);

  ngOnInit(): void {
    this.languages = this.prefs.availableLangs
      .map((code) => LANGUAGE_CONFIG[code])
      .filter((lang): lang is LanguageInfo => !!lang);

    this.selectedLanguage = this.prefs.current.language;
  }

  async selectLanguage(code: string): Promise<void> {
    if (code === this.selectedLanguage) return;
    this.selectedLanguage = code;
    await this.prefs.setLanguage(code);
  }

  goBack(): void {
    this.location.back();
  }
}
