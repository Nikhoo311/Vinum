import { NgModule } from '@angular/core';
import { provideTransloco, TranslocoModule } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';

import { environment } from '../environments/environment';
import { TranslocoHttpLoader } from './transloco-loader';

/** Langues de l'application : chaque entrée doit avoir son fichier dans `assets/i18n`. */
export const AVAILABLE_LANGS = ['fr', 'en', 'es', 'it'];
export const DEFAULT_LANG = 'fr';

@NgModule({
  exports: [TranslocoModule],
  providers: [
    provideTransloco({
      config: {
        availableLangs: AVAILABLE_LANGS,
        defaultLang: DEFAULT_LANG,
        fallbackLang: DEFAULT_LANG,
        missingHandler: { useFallbackTranslation: true },
        failedRetries: 1,
        reRenderOnLangChange: true,
        prodMode: environment.production,
      },
      loader: TranslocoHttpLoader,
    }),
    provideTranslocoMessageformat(),
  ],
})
export class TranslocoRootModule {}
