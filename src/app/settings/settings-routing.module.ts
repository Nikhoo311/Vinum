import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SettingsPage } from './settings.page';
import { FavoriteWinePage } from './favorite-wine/favorite-wine.page';
import { PersonalInformationPage } from './personal-information/personal-information.page';
import { LanguagePage } from './language/language.page';
import { StarWinePage } from './star-wine/star-wine.page';

const routes: Routes = [
  {
    path: '',
    component: SettingsPage
  },
  {
    path: 'favorite-wine',
    component: FavoriteWinePage
  },
  {
    path: 'personal-information',
    component: PersonalInformationPage
  },
  {
    path: 'language',
    component: LanguagePage
  },
  {
    path: 'star-wine',
    component: StarWinePage
  }


];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsPageRoutingModule {}
