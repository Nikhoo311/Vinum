import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { environment } from '../../environments/environment';
import { TabsPage } from './tabs.page';

/** Les routes enfants héritent de la protection (`setupGuard`) posée sur le chemin parent. */
const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () => import('../home/home.module').then((m) => m.HomePageModule),
      },
      {
        path: 'cave',
        loadChildren: () => import('../cave/cave.module').then((m) => m.CavePageModule),
      },
      ...(environment.features.catalogue
        ? [
            {
              path: 'catalogue',
              // Page provisoire : à remplacer par la page catalogue.
              loadChildren: () => import('../home/home.module').then((m) => m.HomePageModule),
            },
          ]
        : []),
      {
        path: 'settings',
        loadChildren: () => import('../settings/settings.module').then((m) => m.SettingsPageModule),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}
