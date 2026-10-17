import { NgModule, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { initializeFirestore, persistentLocalCache, provideFirestore } from '@angular/fire/firestore';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PreferencesService } from './core/services/preferences.service';
import { TranslocoRootModule } from './transloco-root.module';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule, TranslocoRootModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    // Cache persistant : la cave reste consultable (et modifiable) sans réseau.
    provideFirestore(() => initializeFirestore(getApp(), { localCache: persistentLocalCache() })),
    // Langue et thème sont chargés avant le premier affichage (pas de flash de contenu).
    provideAppInitializer(() => inject(PreferencesService).init()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
